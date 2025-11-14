import { invite_menu_kb } from '../common';
import { EditOrSend } from '../helpers/EditOrSend';
import { friendsText } from '../texts';
import { MyContext } from '../typings/context';

export const bonusMenu = async (ctx: MyContext) => {
  await ctx.api.sendMessage(ctx.chat.id, friendsText, {
    reply_markup: invite_menu_kb(ctx.from.id),
  });
};
