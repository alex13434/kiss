import { InputFile } from 'grammy';
import { redis } from '../bot';
import { groupStartText } from '../texts';
import { MyContext } from '../typings/context';
import { InputMediaBuilder } from 'grammy';

const paths = ['assets/1.JPEG', 'assets/2.JPEG'];

const startCap = `👋 Привет!

📸 Отправь мне <b>2 фото одним сообщением</b>, и я создам изображение, где эти люди целуются 💋`;

export const startHandler = async (ctx: MyContext) => {
  if ((await redis.get(String(ctx.chat.id))) == '1') {
  } else {
    const files = paths.map(path => new InputFile(path));
    const media = files.map(file => InputMediaBuilder.photo(file));
    await ctx.api.sendMediaGroup(ctx.chat.id, media);
    await redis.set(String(ctx.chat.id), '1');
  }
  await ctx.api.sendMessage(
    ctx.chat.id,
    '📸 Отправь <b>2 фото одним сообщением</b> — я создам изображение, где эти люди целуются 💋'
  );
};

export const groupStartHandler = async (ctx: MyContext) => {
  const isProcessed = await redis.get(`groupStart:${ctx.chat.id}`);
  if (!(isProcessed == '0')) {
    await redis.set(`groupStart:${ctx.chat.id}`, 0);
  } else {
    await ctx.api.sendMessage(ctx.chat.id, groupStartText());
  }
};
