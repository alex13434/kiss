import { MyContext } from '../typings/context';
import { InputFile } from 'grammy';
import { NanoBananaAPI } from '../utils/NanoBananaAPI';

const albumStorage = new Map<
  string,
  { photos: any[]; timeout: NodeJS.Timeout }
>();
const ALBUM_TIMEOUT = 3000;
const REQUIRED_PHOTOS = 2;

// Инициализация API
const nanoAPI = new NanoBananaAPI('09f7c9fc49fcfaed1b7950557af5e6da'); // Замени на свой

export const mediaHandler = async (ctx: MyContext) => {
  const message = ctx.message;
  if (!message || !('photo' in message)) return;

  const mediaGroupId = message.media_group_id;
  const photo = message.photo![message.photo!.length - 1]; // лучшее качество

  // Только альбомы (2 фото в одном сообщении)
  if (!mediaGroupId) {
    await ctx.reply(
      'Пожалуйста, отправьте **2 фото в одном сообщении** (альбомом), чтобы я сделал поцелуй.'
    );
    return;
  }

  let entry = albumStorage.get(mediaGroupId);

  // Первое фото в альбоме
  if (!entry) {
    const timeout = setTimeout(() => cleanupAlbum(mediaGroupId), ALBUM_TIMEOUT);
    entry = { photos: [], timeout };
    albumStorage.set(mediaGroupId, entry);

    await ctx.reply(
      'Получил первое фото... Жду второе! Отправьте **оба фото вместе**.'
    );
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
    await processKissAlbum(mediaGroupId, ctx);
  }

  // Если больше 2 — обрезаем
  if (entry.photos.length > REQUIRED_PHOTOS) {
    entry.photos = entry.photos.slice(0, REQUIRED_PHOTOS);
  }
};

// Очистка, если пользователь не отправил второе фото
function cleanupAlbum(mediaGroupId: string) {
  if (albumStorage.has(mediaGroupId)) {
    albumStorage.delete(mediaGroupId);
  }
}

// Основная логика: делаем поцелуй
async function processKissAlbum(mediaGroupId: string, ctx: MyContext) {
  const entry = albumStorage.get(mediaGroupId);
  if (!entry || entry.photos.length < 2) {
    cleanupAlbum(mediaGroupId);
    return;
  }

  const photos = entry.photos;
  cleanupAlbum(mediaGroupId);

  const statusMsg = await ctx.reply(
    '💋 <b>Готовлю поцелуй...</b> Это займёт ~30–60 секунд',
    {
      reply_to_message_id: photos[0].message_id,
    }
  );

  try {
    // 1. Получаем file_path из Telegram
    const file1 = await ctx.api.getFile(photos[0].file_id);
    const file2 = await ctx.api.getFile(photos[1].file_id);

    const photoUrl1 = `https://api.telegram.org/file/bot${ctx.api.token}/${file1.file_path}`;
    const photoUrl2 = `https://api.telegram.org/file/bot${ctx.api.token}/${file2.file_path}`;

    // 2. Отправляем в NanoBanana API
    const taskId = await nanoAPI.generateImage('make these people kiss', {
      type: 'TEXTTOIAMGE', // или 'MERGE', 'KISS' — проверь документацию
      numImages: 1,
      imageUrls: [photoUrl1, photoUrl2],
      watermark: false,
    });

    // 3. Ждём результат
    await ctx.reply('Генерация началась... Ожидайте.', {
      reply_to_message_id: statusMsg.message_id,
    });
    const result = await nanoAPI.waitForCompletion(taskId);

    // 4. Отправляем готовое изображение
    //@ts-ignore
    await ctx.replyWithPhoto(new InputFile({ url: result }), {
      caption: 'Поцелуй готов!',
      reply_to_message_id: photos[0].message_id,
    });

    await ctx.api
      .deleteMessage(ctx.chat!.id, statusMsg.message_id)
      .catch(() => {});
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : 'Неизвестная ошибка';
    await ctx.reply(`Ошибка: ${errMsg}`, {
      reply_to_message_id: photos[0].message_id,
    });
    console.error('Kiss generation error:', error);
  }
}
