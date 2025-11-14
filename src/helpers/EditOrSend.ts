import { Other } from '@grammyjs/hydrate';
import { MyContext } from '../typings/context';

export const EditOrSend = async (
  ctx: MyContext,
  text: string,
  extra?:
    | Other<'editMessageText', 'chat_id' | 'message_id' | 'text'>
    | Other<'sendMessage'>,
  deleteMessage: boolean = false
) => {
  if (deleteMessage) await ctx.deleteMessage();

  if (ctx.callbackQuery && !deleteMessage) {
    const editExtra = extra as Other<
      'editMessageText',
      'chat_id' | 'message_id' | 'text' | 'inline_message_id'
    >;
    try {
      const message = await ctx.editMessageText(text, editExtra);
      return message;
    } catch {
      const message = await ctx.reply(text, extra);
      return message;
    }
  } else {
    const message = await ctx.reply(text, extra);
    return message;
  }
};
