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
  if (provider == 'flyer') {
    console.log('TASKS', tasks);
  }
  const tasksKeyboard = new InlineKeyboard();

  let globalButtonIndex = 0;
  const totalButtons = tasks.reduce((sum, task) => {
    if (provider === 'flyer') {
      return sum + (Array.isArray(task.links) ? task.links.length : 0);
    }
    return sum + 1;
  }, 0);

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    if (provider === 'subgram' || provider === 'tgrass') {
      const text =
        task.type === 'channel'
          ? '📢 Подписаться'
          : task.type === 'bot'
            ? '🤖 Запустить'
            : '🔗 Перейти';

      tasksKeyboard.url(text, task.link);

      if (
        globalButtonIndex % 2 !== 0 ||
        globalButtonIndex === totalButtons - 1
      ) {
        tasksKeyboard.row();
      }
      globalButtonIndex++;
    } else if (provider === 'flyer') {
      let baseText: string;
      switch (task.task) {
        case 'subscribe channel':
          baseText = '📢 Подписаться';
          break;
        case 'start bot':
          baseText = '🤖 Запустить';
          break;
        default:
          baseText = '🔗 Перейти';
          break;
      }

      const links = Array.isArray(task.links) ? task.links : [];
      if (links.length === 0) {
        // fallback, если links пустой
        tasksKeyboard.url(baseText, 'https://t.me');
        if (
          globalButtonIndex % 2 !== 0 ||
          globalButtonIndex === totalButtons - 1
        ) {
          tasksKeyboard.row();
        }
        globalButtonIndex++;
        continue;
      }

      links.forEach((link: string, idx: number) => {
        const buttonText =
          links.length > 1 ? `${baseText} ${idx + 1}` : baseText;

        tasksKeyboard.url(buttonText, link);

        if (
          globalButtonIndex % 2 !== 0 ||
          globalButtonIndex === totalButtons - 1
        ) {
          tasksKeyboard.row();
        }
        globalButtonIndex++;
      });
    }
  }

  // Кнопка проверки
  return tasksKeyboard.text('✅ Проверить', `check_subs_${provider}`);
};
