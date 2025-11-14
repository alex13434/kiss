import { invite_kb, invite_menu_kb } from '../common';
import { EditOrSend } from '../helpers/EditOrSend';
import { friendsText } from '../texts';
import { MyContext } from '../typings/context';

export const friendsMenuCQ = async (ctx: MyContext) => {
  await EditOrSend(ctx, friendsText, { reply_markup: invite_kb(ctx.from.id) });
};

export const friendsMenu = async (ctx: MyContext) => {
  await ctx.api.sendMessage(ctx.chat.id, friendsText, {
    reply_markup: invite_menu_kb(ctx.from.id),
  });
};
