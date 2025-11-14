import { InlineKeyboard } from 'grammy';
import { EditOrSend } from '../helpers/EditOrSend';
import { mainText, subText } from '../texts';
import { MyContext } from '../typings/context';
import { checkSubscribes, setUsedProvider } from './taskManager';
import { redis } from '../bot';
import { User } from '../models/user';

export interface IActiveTask {
  user_id: number;
  message_id: number;
  provider: string;
  subCount: number;
  sentAt: Date;
}

const PROVIDER_PRIORITIES = [
  { name: 'subgram', priority: 1 },
  { name: 'flyer', priority: 2 },
  { name: 'tgrass', priority: 3 },
];

export const sendTasks = async (ctx: MyContext) => {
  const tasksKeys = await redis.keys(`activeTasks:${ctx.from.id}:*`);
  if (tasksKeys) {
    for (const taskKey of tasksKeys) {
      //@ts-ignore
      const task: IActiveTask = await redis.hgetall(taskKey);
      if (!task) continue;

      try {
        await redis.del(taskKey);
        await ctx.api.deleteMessage(ctx.chat.id, task.message_id);
      } catch (error) {}
    }
  }

  const { usedProviders } = await User.findOne({
    telegram_id: ctx.from.id,
  });

  let leastUsedProvider = PROVIDER_PRIORITIES[0].name;
  let minUsage = usedProviders.get(leastUsedProvider) || 0;

  for (const provider of PROVIDER_PRIORITIES) {
    const usage = usedProviders.get(provider.name) || 0;
    if (
      usage < minUsage ||
      (usage === minUsage &&
        provider.priority <
          PROVIDER_PRIORITIES.find(p => p.name === leastUsedProvider)!.priority)
    ) {
      minUsage = usage;
      leastUsedProvider = provider.name;
    }
  }

  console.log(leastUsedProvider);

  const { isSubscribed, unsubscribedTasks } = await checkSubscribes(
    ctx,
    leastUsedProvider
  );

  if (!isSubscribed) {
    const tasks = unsubscribedTasks;

    if (tasks.length !== 0) {
      try {
        console.log(
          'BUTTON',
          tasksKeyboard(tasks, leastUsedProvider).inline_keyboard[0],
          tasksKeyboard(tasks, leastUsedProvider).inline_keyboard[1]
        );
        const message = await EditOrSend(ctx, subText, {
          reply_markup: tasksKeyboard(tasks, leastUsedProvider),
        });
        const activeTask: IActiveTask = {
          user_id: ctx.from.id,
          //@ts-ignore
          message_id: message.message_id,
          provider: leastUsedProvider,
          subCount: tasks.length,
          sentAt: new Date(),
        };
        await redis.hset(
          `activeTasks:${ctx.from.id}:${leastUsedProvider}`,
          activeTask
        );
      } catch (error) {}
      return 'incompleted';
    }
    await setUsedProvider(leastUsedProvider, ctx.from.id);
    return 'no_tasks';
  }
  await setUsedProvider(leastUsedProvider, ctx.from.id);
  return 'completed';
};

export const tasksKeyboard = (tasks: any[], provider: string) => {
  const tasksKeyboard = new InlineKeyboard();

  for (let i = 0; i < tasks.length; i++) {
    let text;
    if (provider === 'subgram') {
      text =
        tasks[i].type === 'channel'
          ? '📢 Подписаться'
          : tasks[i].type === 'bot'
            ? '🤖 Запустить'
            : '🔗 Перейти';
    } else if (provider === 'flyer') {
      console.log('FLYER_TASKS', tasks);
      text =
        tasks[i].task === 'subscribe channel'
          ? '📢 Подписаться'
          : tasks[i].task === 'start bot'
            ? '🤖 Запустить'
            : '🔗 Перейти';
    } else if (provider === 'tgrass') {
      text =
        tasks[i].type === 'channel'
          ? '📢 Подписаться'
          : tasks[i].type === 'bot'
            ? '🤖 Запустить'
            : '🔗 Перейти';
    }
    if (provider === 'flyer' && tasks[i].links[0]) {
      tasksKeyboard.url(text, tasks[i].links[0]);
    } else {
      tasksKeyboard.url(text, tasks[i].link);
    }
    i % 2 !== 0 || i === tasks.length - 1 ? tasksKeyboard.row() : null;
  }
  return tasksKeyboard.text('✅ Проверить', `check_subs_${provider}`);
};
