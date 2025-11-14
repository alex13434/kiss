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
import { checkTasks, giveFriendReward } from '../helpers/checkTasks';
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

export const resumeGame = async (ctx: MyContext, gameState: GameState) => {
  const gameStateKey = getGameStateKey(ctx.from.id);
  const user = await User.findOne({ telegram_id: ctx.from.id });

  await giveFriendReward(ctx, user);

  if (gameState.stage === 'throwing') {
    for (let i = gameState.results.length; i < gameState.playsCount; i++) {
      const message = await ctx.api.sendDice(gameState.chatId, DICE);
      const diceValue = message.dice.value;
      gameState.results.push(diceValue);
      if (WINVALUES.includes(diceValue)) {
        gameState.successfulThrows++;
      }
      gameState.stage = i + 1 < gameState.playsCount ? 'throwing' : 'results';
      await redis.set(gameStateKey, JSON.stringify(gameState), 'EX', 3600);
      await delay(800);
    }
  }

  if (gameState.stage !== 'throwing') {
    user.gamesPlayed.set(
      String(gameState.index),
      (user.gamesPlayed.get(String(gameState.index)) || 0) + 1
    );
    await user.save();
  }

  const allGoals = gameState.successfulThrows === gameState.playsCount;

  if (gameState.stage === 'results') {
    let resultMessage = resultsHeaderText(gameState.playsCount);
    resultMessage += '<blockquote>';
    gameState.results.forEach((value, i) => {
      resultMessage += resultPlayText(i, value);
    });
    resultMessage += '</blockquote>';

    await delay(3500);
    await ctx.api.sendMessage(gameState.chatId, resultMessage, {
      parse_mode: 'HTML',
    });
    gameState.stage = allGoals ? 'complete' : 'retry';
    await redis.set(gameStateKey, JSON.stringify(gameState), 'EX', 3600);
  }

  if (gameState.stage === 'retry') {
    await delay(750);
    await ctx.api.sendMessage(gameState.chatId, retryGameText);
    await delay(1250);
    await ctx.api.sendMessage(gameState.chatId, mainText(user.balance), {
      reply_markup: main_kb(),
      link_preview_options: { is_disabled: true },
    });
    gameState.stage = 'complete';
    await redis.set(gameStateKey, JSON.stringify(gameState), 'EX', 3600);
  }

  if (gameState.stage === 'complete' && allGoals) {
    const starCount = gameState.isPremiumGame ? 25 : 15;
    const gift = await getAvailableGifts(ctx, starCount);
    const giftSent = await sendGiftToUser(ctx, ctx.from.id, gift.id, starCount);
    if (!giftSent) {
      await ctx.api.sendMessage(
        gameState.chatId,
        `что-то пошло не так, не получилось отправить подарок!`,
        { parse_mode: 'HTML' }
      );
    }
    await delay(2000);
    await ctx.api.sendMessage(gameState.chatId, mainText(user.balance), {
      reply_markup: main_kb(),
      link_preview_options: { is_disabled: true },
    });
  }

  if (gameState.stage === 'complete') {
    await redis.del(gameStateKey);
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

  if (isFreeGame && !isComplete) {
    const result = await checkTasks(ctx);
    if (result == 'incompleted' || result == 'on_cooldown') {
      return;
    }
  }

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

  await resumeGame(ctx, gameState);
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
