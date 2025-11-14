import { delay } from '../admin/mailing';
import {
  DICE,
  getDiceEnding,
  items,
  main_kb,
  PREMINDEX,
  WINVALUES,
} from '../common';
import { EditOrSend } from '../helpers/EditOrSend';
import {
  gameNameText,
  invoicePlusText,
  invoiceText,
  mainText,
  resultPlayText,
  resultsHeaderText,
  retryGameText,
} from '../texts';
import { MyContext } from '../typings/context';
import { User } from '../models/user';
import { redis } from '../bot';
import { logError } from '../utils/logger';

interface GameState {
  index: number;
  playsCount: number;
  successfulThrows: number;
  results: number[];
  stage: 'throwing' | 'results' | 'retry' | 'complete';
  isComplete: boolean;
  isPremiumGame: boolean;
  isFreeGame: boolean;
  chatId: number;
}

const getGameStateKey = (userId: number) => `gameState:${userId}`;

const getAvailableGifts = async (ctx: MyContext, starCount: number) => {
  try {
    const giftsResponse = await ctx.api.getAvailableGifts();
    const gifts = giftsResponse.gifts;
    const matchingGifts = gifts.filter(
      (gift: any) => gift.star_count === starCount
    );
    return matchingGifts.length > 0
      ? matchingGifts[Math.floor(Math.random() * matchingGifts.length)]
      : null;
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return null;
  }
};

export const sendGiftToUser = async (
  ctx: MyContext,
  userId: number,
  giftId: string,
  starCount: number
) => {
  try {
    await ctx.api.raw.sendGift({
      user_id: userId,
      gift_id: giftId,
      pay_for_upgrade: false,
    });
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
};

export const startGame = async (
  ctx: MyContext,
  index: number,
  isComplete = false
) => {
  const gameStateKey = getGameStateKey(ctx.from.id);

  const playsCount = items[index][1];
  const isFreeGame = index === 0;
  const isPremiumGame = index === PREMINDEX;

  // if (isFreeGame && !isComplete) {
  //   // const result = await checkTasks(ctx);
  //   if (result == 'incompleted' || result == 'on_cooldown') {
  //     return;
  //   }
  // }

  const gameState: GameState = {
    index,
    playsCount,
    successfulThrows: 0,
    results: [],
    stage: 'throwing',
    isComplete,
    isPremiumGame,
    isFreeGame,
    chatId: ctx.chat.id,
  };

  await redis.set(gameStateKey, JSON.stringify(gameState), 'EX', 3600);

  await User.updateOne(
    { telegram_id: ctx.from.id },
    { $inc: { totalGamesCount: 1 } }
  );

  // await resumeGame(ctx, gameState);
};

export const gameCQ = async (ctx: MyContext) => {
  const index = Number(ctx.callbackQuery.data.split('game_')[1]);

  if (index === 0) {
    await startGame(ctx, index);
  } else {
    const { balance } = await User.findOne({ telegram_id: ctx.from.id }).select(
      'balance'
    );
    if (balance >= items[index][0]) {
      await User.updateOne(
        { telegram_id: ctx.from.id },
        { $inc: { balance: -items[index][0] } }
      );
      await ctx.answerCallbackQuery(gameNameText(index));
      await delay(200);
      startGame(ctx, index);
    } else {
      await ctx.api.sendInvoice(
        ctx.chat.id,
        gameNameText(index),
        index === PREMINDEX ? invoicePlusText : invoiceText,
        `game_${index}`,
        'XTR',
        [{ label: 'играть за', amount: items[index][0] }],
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: `играть за ⭐ ${items[index][0]}`, pay: true }],
            ],
          },
        }
      );
      await delay(200);
      await ctx.answerCallbackQuery(gameNameText(index));
    }
  }
};

export const successfulPaymentHandler = async (ctx: MyContext) => {
  const index = Number(
    ctx.message.successful_payment.invoice_payload.split('game_')[1]
  );
  await startGame(ctx, index);
};

export const backMenuCQ = async (ctx: MyContext) => {
  const { balance } = await User.findOne({ telegram_id: ctx.from.id }).select(
    'balance'
  );
  await EditOrSend(ctx, mainText(balance), {
    reply_markup: main_kb(),
    link_preview_options: { is_disabled: true },
  });
};

export const preCheckoutQueryHandler = async (ctx: MyContext) => {
  await ctx.answerPreCheckoutQuery(true);
};
