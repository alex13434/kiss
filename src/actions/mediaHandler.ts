import { MyContext } from '../typings/context';
import { InputFile } from 'grammy';
import { NanoBananaAPI } from '../utils/NanoBananaAPI';
import { User } from '../models/user';
import { checkTasks, giveFriendReward } from '../helpers/checkTasks';
import { donate_kb, getGenEnding, items } from '../common';
import { redis } from '../bot';
import { mainText, zeroGensText } from '../texts';

const REQUIRED_PHOTOS = 2;

export const nanoAPI = new NanoBananaAPI('09f7c9fc49fcfaed1b7950557af5e6da');

interface AlbumEntry {
  photos: { file_id: string; message_id: number }[];
  mediaGroupId: string;
}

const ALBUM_KEY = (userId: string) => `kiss:album:${userId}`;

async function getAlbum(userId: string): Promise<AlbumEntry | null> {
  const data = await redis.get(ALBUM_KEY(userId));
  return data ? JSON.parse(data) : null;
}

async function setAlbum(userId: string, entry: AlbumEntry): Promise<void> {
  await redis.set(ALBUM_KEY(userId), JSON.stringify(entry));
}

async function deleteAlbum(userId: string): Promise<void> {
  await redis.del(ALBUM_KEY(userId));
}

export const mediaHandler = async (ctx: MyContext) => {
  const message = ctx.message;
  if (!message || !('photo' in message)) return;

  const mediaGroupId = message.media_group_id;
  const photo = message.photo![message.photo!.length - 1];

  if (!mediaGroupId) {
    await ctx.reply(mainText);
    return;
  }

  const userId = String(ctx.from.id);
  let entry = await getAlbum(userId);

  if (!entry) {
    entry = { photos: [], mediaGroupId };
  } else if (entry.mediaGroupId !== mediaGroupId) {
    entry = { photos: [], mediaGroupId };
  }

  entry.photos.push({
    file_id: photo.file_id,
    message_id: message.message_id,
  });

  await setAlbum(userId, entry);

  if (entry.photos.length === REQUIRED_PHOTOS) {
    const result = await checkTasks(ctx);
    if (result === 'completed' || result === 'no_tasks') {
      await processKissAlbum(ctx);
    }
  }

  if (entry.photos.length > REQUIRED_PHOTOS) {
    entry.photos = entry.photos.slice(0, REQUIRED_PHOTOS);
    await setAlbum(userId, entry);
  }
};

export async function processKissAlbum(ctx: MyContext) {
  const userId = ctx.from.id;
  const userIdStr = String(userId);

  // === 1. Получаем фото из Redis ===
  const entry = await getAlbum(userIdStr);
  if (!entry || entry.photos.length < REQUIRED_PHOTOS) {
    return;
  }

  const photos = entry.photos;

  // === 2. Проверяем баланс ===
  const user = await User.findOne({ telegram_id: userId });
  if (!user || user.generations < 1) {
    return ctx.reply(zeroGensText, {
      reply_markup: donate_kb(userId),
    });
  }

  // === 3. Списываем генерацию ===
  await User.updateOne(
    { telegram_id: userId },
    { $inc: { usedGenCount: 1, generations: -1 } }
  );

  await deleteAlbum(userIdStr);

  // === 4. Скачиваем файлы ===
  let photoUrl1: string, photoUrl2: string;
  try {
    const file1 = await ctx.api.getFile(photos[0].file_id);
    const file2 = await ctx.api.getFile(photos[1].file_id);
    photoUrl1 = `https://api.telegram.org/file/bot${ctx.api.token}/${file1.file_path}`;
    photoUrl2 = `https://api.telegram.org/file/bot${ctx.api.token}/${file2.file_path}`;
  } catch (error: any) {
    await ctx.reply(`Ошибка загрузки фото: ${error.message}`, {
      reply_to_message_id: photos[0].message_id,
    });
    return;
  }

  // === 5. Уведомление ===
  await ctx.reply(
    '💋 <b>Делаю поцелуй...</b>\n\n<blockquote>⏰ Это займёт ~30-60 секунд</blockquote>',
    { reply_to_message_id: photos[0].message_id }
  );

  // === 6. Запуск генерации ===
  try {
    const taskId = await nanoAPI.generateImage('make these people kiss', {
      type: 'TEXTTOIAMGE',
      numImages: 1,
      imageUrls: [photoUrl1, photoUrl2],
      watermark: false,
    });

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
    await redis.sadd('kiss:active_tasks', taskId);
  } catch (error: any) {
    await ctx.reply(`Ошибка запуска генерации: ${error.message}`, {
      reply_to_message_id: photos[0].message_id,
    });
  }
}
