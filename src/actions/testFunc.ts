import { DICE, WINVALUES } from '../common';
import { MyContext } from '../typings/context';
import { sendGiftToUser } from './game';

export const testFunc = async (ctx: MyContext) => {
  try {
    const giftsResponse = await ctx.api.getAvailableGifts();
    const gifts = giftsResponse.gifts;
    const matchingGifts = gifts.filter(
      (gift: any) => gift.sticker.emoji === '💍'
    );
    const diceMsg = await ctx.api.sendDice(ctx.chat.id, DICE);
    if (WINVALUES.includes(diceMsg.dice.value)) {
      await sendGiftToUser(ctx, ctx.from.id, matchingGifts[0].id, 100);
    }
  } catch (error) {
    console.error('Error fetching gifts:', error);
  }
};
