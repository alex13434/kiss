import { Worker, Queue, Job } from 'bullmq';
import {
  MyContext,
  MyConversation,
  MyConversationContext,
} from '../typings/context';
import {
  cancel_mail_conv_kb,
  choise_rec_kb,
  pause_mailing_kb,
  resume_mailing_kb,
  start_mail_conv_kb,
} from '../common';
import { User } from '../models/user';
import { bot, redis } from '../bot';
import { Group } from '../models/group';
import { v4 as uuidv4 } from 'uuid';
import { GrammyError } from 'grammy';
import config from '../typings/config';

const connection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
};

let isMailingInitialized: boolean = false;
let worker: Worker;
let MailStatusMsg: any;
let Letter: any;
let Choise: string;
let queueName: string;
let totalTasks: number = 0;
let send_count: number = 0;
let successful_count: number = 0;
let bot_was_blocked_count: number = 0;
let too_many_requests: number = 0;
const MAILING_STATE_KEY = 'mail:state';

const cleanup = async (complete: boolean = false) => {
  if (worker) {
    await worker.close();
  }
  if (complete) {
    await redis
      .multi()
      .del('mail:send_count')
      .del('mail:successful_count')
      .del('mail:bot_was_blocked_count')
      .del(MAILING_STATE_KEY)
      .exec();
  }
  if (queueName) {
    const queue = new Queue(queueName, { connection });
    await queue.obliterate({ force: true });
    await queue.close();
  }
};

export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

const MailStatusText = (nl_status: string) => {
  return `<b>Информация о рассылке:</b>

Всего получателей: ${totalTasks}

Отправлено: ${send_count}
- Успешно: ${successful_count}
- Блокировали: ${bot_was_blocked_count}
- Флудов: ${too_many_requests}

Статус: ${nl_status}`;
};

const saveMailingState = async (state: string) => {
  await redis.set(
    MAILING_STATE_KEY,
    JSON.stringify({
      queueName,
      totalTasks,
      chatId: MailStatusMsg?.chat.id,
      messageId: MailStatusMsg?.message_id,
      letter: Letter,
      choise: Choise,
      status: state,
    })
  );
};

const getMailingState = async () => {
  const state = await redis.get(MAILING_STATE_KEY);
  return state ? JSON.parse(state) : null;
};

const pauseMailing = async () => {
  if (worker) {
    await worker.pause();
    await saveMailingState('paused');
    await bot.api.editMessageText(
      MailStatusMsg.chat.id,
      MailStatusMsg.message_id,
      MailStatusText('На паузе'),
      { reply_markup: resume_mailing_kb }
    );
  }
};

const resumeMailing = async () => {
  if (!worker) {
    await startWorker(true);
  } else {
    worker.resume();
  }

  await saveMailingState('active');

  try {
    await bot.api.editMessageText(
      MailStatusMsg.chat.id,
      MailStatusMsg.message_id,
      MailStatusText('Активна'),
      { reply_markup: pause_mailing_kb }
    );
  } catch (e) {}
};

const startWorker = async (isResume: boolean = false) => {
  if (!isResume) {
    await redis
      .multi()
      .set('mail:send_count', 0)
      .set('mail:successful_count', 0)
      .set('mail:bot_was_blocked_count', 0)
      .set('mail:too_many_requests', 0)
      .exec();
    send_count = 0;
    successful_count = 0;
    bot_was_blocked_count = 0;
    too_many_requests = 0;
  }
  let completedTasks = 0;

  worker = new Worker(
    queueName,
    async job => {
      const { chat_id, receiver_id } = job.data;
      try {
        if (Letter.update.message.reply_markup) {
          await bot.api.copyMessage(
            receiver_id,
            chat_id,
            Letter.update.message.message_id,
            { reply_markup: Letter.update.message.reply_markup }
          );
        } else {
          await bot.api.copyMessage(
            receiver_id,
            chat_id,
            Letter.update.message.message_id
          );
        }
        await redis.incr('mail:successful_count');
        await delay(50);
      } catch (error) {
        if (error instanceof GrammyError) {
          if (error.error_code == 403) {
            await redis.incr('mail:bot_was_blocked_count');
          } else if (error.error_code === 429) {
            await redis.incr('mail:too_many_requests');
          }
        }
      }
    },
    {
      concurrency: 30,
      limiter: { max: 30, duration: 1000 },
      connection,
      autorun: true,
    }
  );

  worker.on('completed', async (job: Job) => {
    send_count = await redis.incr('mail:send_count');
    successful_count = Number(await redis.get('mail:successful_count'));
    bot_was_blocked_count = Number(
      await redis.get('mail:bot_was_blocked_count')
    );
    too_many_requests = Number(await redis.get('mail:too_many_requests'));
    completedTasks++;
    if (send_count % 500 == 0) {
      try {
        const state = await getMailingState();
        if (state.status === 'active') {
          await bot.api.editMessageText(
            MailStatusMsg.chat.id,
            MailStatusMsg.message_id,
            MailStatusText('Активна'),
            { reply_markup: pause_mailing_kb }
          );
        }
      } catch (error) {}
    }
    if (totalTasks == completedTasks) {
      await cleanup(true);
      try {
        await bot.api.editMessageText(
          MailStatusMsg.chat.id,
          MailStatusMsg.message_id,
          MailStatusText('Завершена')
        );
      } catch (e) {
        console.error('Error updating completion message:', e);
      }
    }
  });

  worker.on('failed', async (job: Job, err: Error) => {
    console.error(`Job ${job.id} failed with error:`, err);
  });

  await saveMailingState('active');
  isMailingInitialized = true;
};

export const initializeMailing = async () => {
  const state = await getMailingState();
  if (!state) return;

  queueName = state.queueName;
  totalTasks = state.totalTasks;
  Letter = state.letter;
  Choise = state.choise;
  MailStatusMsg = { chat: { id: state.chatId }, message_id: state.messageId };

  // Восстанавливаем счетчики из Redis
  send_count = Number(await redis.get('mail:send_count')) || 0;
  successful_count = Number(await redis.get('mail:successful_count')) || 0;
  bot_was_blocked_count =
    Number(await redis.get('mail:bot_was_blocked_count')) || 0;
  too_many_requests = Number(await redis.get('mail:too_many_requests')) || 0;

  if (state.status === 'active') {
    await resumeMailing();
  }
};

async function addMessagesToBulk(chat_id: number, receivers: any[]) {
  const queue = new Queue(queueName, { connection });
  totalTasks = 0;
  const jobs = receivers.map(receiver => {
    totalTasks++;
    return queue.add('sendMessage', {
      chat_id: chat_id,
      receiver_id: receiver.group_id || receiver.telegram_id,
    });
  });

  await Promise.all(jobs);
  await queue.close();
}

const startMail = async (ctx: MyContext) => {
  let receivers;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  switch (Choise) {
    case 'users':
      receivers = await User.find({ status: 1 }).select('telegram_id').lean();
      break;
    case 'groups':
      receivers = await Group.find({ status: 1 }).select('group_id').lean();
      break;
    case 'all':
      const users = await User.find({
        status: 1,
      })
        .select('telegram_id')
        .lean();
      const groups = await Group.find({
        status: 1,
      })
        .select('group_id')
        .lean();
      receivers = [...users, ...groups];
      break;
    default:
      break;
  }
  queueName = uuidv4();
  await addMessagesToBulk(ctx.chat.id, receivers);
  await startWorker();
  MailStatusMsg = await ctx.api.sendMessage(
    ctx.chat.id,
    MailStatusText('Активна'),
    { reply_markup: pause_mailing_kb }
  );
  await saveMailingState('active');
};

export const resumeExistingMailing = async (ctx: MyContext) => {
  const state = await getMailingState();
  if (!state) {
    await ctx.reply('Нет активной или приостановленной рассылки');
    return;
  }

  queueName = state.queueName;
  totalTasks = state.totalTasks;
  Letter = state.letter;
  Choise = state.choise;
  MailStatusMsg = { chat: { id: state.chatId }, message_id: state.messageId };

  // Восстанавливаем счетчики
  send_count = Number(await redis.get('mail:send_count')) || 0;
  successful_count = Number(await redis.get('mail:successful_count')) || 0;
  bot_was_blocked_count =
    Number(await redis.get('mail:bot_was_blocked_count')) || 0;
  too_many_requests = Number(await redis.get('mail:too_many_requests')) || 0;

  if (state.status === 'paused') {
    await startWorker(true); // Запускаем worker в режиме возобновления
    await resumeMailing();
    await ctx.answerCallbackQuery('Рассылка возобновлена');
  } else {
    await ctx.reply('Рассылка уже активна');
  }
};

export const startMailConv = async (
  conversation: MyConversation,
  ctx: MyConversationContext
) => {
  const state = await getMailingState();
  if (state && (state.status === 'active' || state.status === 'paused')) {
    await ctx.reply(
      'Существует активная или приостановленная рассылка. Сначала завершите или отмените её.'
    );
    return;
  }

  const msg = await ctx.api.sendMessage(
    ctx.chat.id,
    'Пришлите сообщение для рассылки:',
    { reply_markup: cancel_mail_conv_kb }
  );
  Letter = await conversation.waitFor('message');

  await ctx.api.editMessageText(
    ctx.chat.id,
    msg.message_id,
    'Рассылаемое сообщение получено!\nВыберите получателей:',
    { reply_markup: choise_rec_kb }
  );
  const ChoiseAnswer = await conversation.waitForCallbackQuery(/^choise_/);
  Choise = ChoiseAnswer.update.callback_query.data.replace('choise_', '');

  await ctx.api.editMessageText(
    ctx.chat.id,
    msg.message_id,
    'Начинать рассылку?',
    { reply_markup: start_mail_conv_kb }
  );
  await conversation.waitForCallbackQuery('go_mail_conv');
  const ctx1 = await conversation.external(ctx => ctx);
  await ctx1.deleteMessage();
  await ctx1.reply('<b>Рассылка начинается!</b>');
  return startMail(ctx1);
};

export const pauseMailingCQ = async (ctx: MyContext) => {
  await pauseMailing();
};

export const resumeMailingCQ = async (ctx: MyContext) => {
  await resumeMailing();
};

export const cancelMailingCQ = async (ctx: MyContext) => {
  try {
    await cleanup(true);
    try {
      await bot.api.editMessageText(
        MailStatusMsg.chat.id,
        MailStatusMsg.message_id,
        MailStatusText('Отменена')
      );
    } catch (e) {
      console.error('Error updating cancel message:', e);
    }
    isMailingInitialized = false;
  } catch (error) {
    console.error('Error cancelling mailing:', error);
    await ctx.answerCallbackQuery('Ошибка при отмене рассылки');
  }
};

export const cancelMailingConvCQ = async (ctx: MyContext) => {
  await ctx.conversation.exit('startMailConv');
  await ctx.deleteMessage();
  await ctx.reply('<b>Рассылка отменена!</b>');
};
