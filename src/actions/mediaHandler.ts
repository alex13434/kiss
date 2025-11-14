import { MyContext } from '../typings/context';
import { InputFile } from 'grammy';
import { NanoBananaAPI } from '../utils/NanoBananaAPI';
import { User } from '../models/user';
import { checkTasks, giveFriendReward } from '../helpers/checkTasks';
import { donate_kb, getGenEnding, items } from '../common';
import { redis } from '../bot';
import { mainText } from '../texts';

export const albumStorage = new Map<
  string,
  { photos: any[]; timeout: NodeJS.Timeout }
>();
const ALBUM_TIMEOUT = 3000;
const REQUIRED_PHOTOS = 2;

// Инициализация API
export const nanoAPI = new NanoBananaAPI('09f7c9fc49fcfaed1b7950557af5e6da'); // Замени на свой

export const mediaHandler = async (ctx: MyContext) => {
  const message = ctx.message;
  if (!message || !('photo' in message)) return;

  const mediaGroupId = message.media_group_id;
  const photo = message.photo![message.photo!.length - 1]; // лучшее качество

  // Только альбомы (2 фото в одном сообщении)
  if (!mediaGroupId) {
    await ctx.reply(mainText);
    return;
  }

  let entry = albumStorage.get(String(ctx.from.id));

  // Первое фото в альбоме
  if (!entry) {
    const timeout = setTimeout(() => cleanupAlbum(mediaGroupId), ALBUM_TIMEOUT);
    entry = { photos: [], timeout };
    albumStorage.set(String(ctx.from.id), entry);
  } else {
    // Сброс таймаута
    clearTimeout(entry.timeout);
    entry.timeout = setTimeout(() => cleanupAlbum(mediaGroupId), ALBUM_TIMEOUT);
  }

  // Добавляем фото
  entry.photos.push({
    file_id: photo.file_id,
    message_id: message.message_id,
  });

  // Если пришло ровно 2 фото — запускаем обработку
  if (entry.photos.length === REQUIRED_PHOTOS) {
    clearTimeout(entry.timeout);
    const { usedGenCount, generations } = await User.findOne({
      telegram_id: ctx.from.id,
    });
    const result = await checkTasks(ctx);
    if (result == 'completed' || result == 'no_tasks') {
      processKissAlbum(ctx);
    }
  }

  // Если больше 2 — обрезаем
  if (entry.photos.length > REQUIRED_PHOTOS) {
    entry.photos = entry.photos.slice(0, REQUIRED_PHOTOS);
  }
};

// Очистка, если пользователь не отправил второе фото
function cleanupAlbum(user_id: string) {
  if (albumStorage.has(user_id)) {
    albumStorage.delete(user_id);
  }
}

export async function processKissAlbum(ctx: MyContext) {
  const userId = ctx.from.id;
  const entry = albumStorage.get(String(userId));
  if (!entry || entry.photos.length < 2) return cleanupAlbum(String(userId));

  const photos = entry.photos;
  cleanupAlbum(String(userId));

  const user = await User.findOne({ telegram_id: userId });
  if (user.generations < 1) {
    return ctx.reply(
      `На вашем балансе 0 генераций. Пополните баланс, чтобы продолжить.

💡 Получайте <b>+2 генерации за каждого приглашенного друга</b>, который создаст фото.`,
      {
        reply_markup: donate_kb(userId),
      }
    );
  }

  await User.updateOne(
    { telegram_id: userId },
    { $inc: { usedGenCount: 1, generations: -1 } }
  );

  const file1 = await ctx.api.getFile(photos[0].file_id);
  const file2 = await ctx.api.getFile(photos[1].file_id);
  const photoUrl1 = `https://api.telegram.org/file/bot${ctx.api.token}/${file1.file_path}`;
  const photoUrl2 = `https://api.telegram.org/file/bot${ctx.api.token}/${file2.file_path}`;

  await ctx.reply(
    '💋 <b>Делаю поцелуй...</b>\n\n<blockquote>⏰ Это займёт ~30-60 секунд</blockquote>',
    { reply_to_message_id: photos[0].message_id }
  );

  try {
    const taskId = await nanoAPI.generateImage('make these people kiss', {
      type: 'TEXTTOIAMGE',
      numImages: 1,
      imageUrls: [photoUrl1, photoUrl2],
      watermark: false,
    });

    // СОХРАНЯЕМ ЗАДАЧУ В REDIS
    const task = {
      taskId,
      userId,
      chatId: ctx.chat.id,
      messageId: photos[0].message_id,
      photoUrls: [photoUrl1, photoUrl2],
      createdAt: Date.now(),
      status: 'pending' as const,
    };

    await redis.set(`kiss:task:${taskId}`, JSON.stringify(task), 'EX', 3600);
    await redis.sadd('kiss:active_tasks', taskId); // множество активных
  } catch (error) {
    //@ts-ignore
    await ctx.reply(`Ошибка запуска: ${error.message}`, {
      reply_to_message_id: photos[0].message_id,
    });
  }
}

export const preCheckoutQueryHandler = async (ctx: MyContext) => {
  await ctx.answerPreCheckoutQuery(true);
};

export const successfulPaymentHandler = async (ctx: MyContext) => {
  const genIndex = Number(
    ctx.message.successful_payment.invoice_payload.split('genIndex_')[1]
  );
  const { generations } = await User.findOneAndUpdate(
    { telegram_id: ctx.from.id },
    { $inc: { generations: items[genIndex][0] } }
  );
  await ctx.api.sendMessage(
    ctx.chat.id,
    `<b>Успешно 🎉</b>

<b>+${items[genIndex][0]} ${getGenEnding(items[genIndex][0])}</b> 🔥 

У вас сейчас <b>${generations + items[genIndex][0]} ${getGenEnding(generations + items[genIndex][0])}</b> на балансе!`
  );
  await processKissAlbum(ctx);
};

export const buyGensCQ = async (ctx: MyContext) => {
  const genIndex = Number(ctx.callbackQuery.data.split('buy_gens_')[1]);
  await ctx.api.sendInvoice(
    ctx.chat.id,
    `Покупка генераций`,
    `+${items[genIndex][0]} ${getGenEnding(items[genIndex][0])} 🔥 на баланс`,
    `genIndex_${genIndex}`,
    'XTR',
    [
      {
        label: `${items[genIndex][0]} ${getGenEnding(items[genIndex][0])} 🔥`,
        amount: items[genIndex][1],
      },
    ],
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: `Купить за ⭐ ${items[genIndex][1]}`, pay: true }],
        ],
      },
    }
  );
};
