import { MyContext } from '../typings/context';
import { InlineKeyboard } from 'grammy';
import { mainText, subText } from '../texts';
import { checkSubGramSubscribes, getSubGramTasks } from './subGramManager';
import { checkFlyerSubscribes, getFlyerTasks } from './flyerManager';
import { redis } from '../bot';
import { User } from '../models/user';
import { IActiveTask, tasksKeyboard } from './sendTasks';
import { checkTgrassSubscribes, getTgrassTasks } from './tgrassManager';
import { processKissAlbum } from '../actions/mediaHandler';

export const checkSubscribes = async (ctx: MyContext, provider: string) => {
  let tasks;
  let unsubscribedTasks: any[] = [];
  let isSubscribed = true;

  if (provider === 'subgram') {
    tasks = await getSubGramTasks(ctx);
  } else if (provider === 'flyer') {
    tasks = await getFlyerTasks(ctx);
  } else if (provider === 'tgrass') {
    tasks = await getTgrassTasks(ctx);
  } else {
    return { isSubscribed, unsubscribedTasks };
  }

  if (tasks && tasks.length) {
    const links = tasks.map((item: any) => item.link);
    if (provider === 'subgram') {
      isSubscribed = await checkSubGramSubscribes(ctx, links);
      unsubscribedTasks = tasks.filter(
        (task: any) => task.status === 'unsubscribed'
      );
    } else if (provider === 'flyer') {
      const { isAllSubs, checkedTasks } = await checkFlyerSubscribes(ctx);
      unsubscribedTasks = checkedTasks.filter(
        (task: any) => task.status === 'incomplete'
      );
      isSubscribed = isAllSubs;
    } else if (provider === 'tgrass') {
      isSubscribed = await checkTgrassSubscribes(ctx);
      unsubscribedTasks = tasks.filter(
        (task: any) => task.subscribed === false
      );
    }
    return { isSubscribed, unsubscribedTasks };
  } else {
    return { isSubscribed, unsubscribedTasks };
  }
};

export const checkButtonCQ = async (ctx: MyContext) => {
  const provider = ctx.callbackQuery.data.split('check_subs_')[1];
  const { isSubscribed, unsubscribedTasks } = await checkSubscribes(
    ctx,
    provider
  );
  if (!isSubscribed) {
    const tasks = unsubscribedTasks;

    if (tasks.length !== 0) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          ctx.callbackQuery.message.message_id,
          subText,
          {
            reply_markup: tasksKeyboard(tasks, provider),
          }
        );
      } catch (error) {}
      try {
        await ctx.answerCallbackQuery('😐 не все задания выполнены =(');
      } catch (error) {
        await ctx.api.sendMessage(
          ctx.chat.id,
          '<b>Что-то пошло не так!</b> отправьте /start чтобы бот снова заработал'
        );
      }
      return;
    }
  } else {
    //@ts-ignore
    const activeTask: IActiveTask = await redis.hgetall(
      `activeTasks:${ctx.from.id}:${provider}`
    );
    await User.updateOne(
      { telegram_id: ctx.from.id },
      {
        $inc: {
          subCount: activeTask.subCount || 0,
        },
      }
    );
    await User.updateOne(
      { telegram_id: ctx.from.id },
      { completeFirstSubs: true }
    );

    await setUsedProvider(provider, ctx.from.id);

    try {
      await ctx.deleteMessage();
    } catch (error) {}
    await processKissAlbum(ctx);
  }
};

export const setUsedProvider = async (provider: string, userId: number) => {
  const user = await User.findOne({ telegram_id: userId });
  user.usedProviders.set(provider, user.usedProviders.get(provider) + 1 || 1);
  await user.save();
};
