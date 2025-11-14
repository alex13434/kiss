import { addToChatKeyboard } from '../common';
import { User } from '../models/user';
import { addToChatText, mainText } from '../texts';
import { MyContext } from '../typings/context';

export const addToChat = async (ctx: MyContext) => {
  await ctx.api.sendMessage(ctx.chat.id, addToChatText, {
    reply_markup: addToChatKeyboard,
  });
};
