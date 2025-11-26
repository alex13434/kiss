import { bot } from '../bot';
import { redis } from '../bot';
import { nanoAPI } from '../actions/mediaHandler';
import { InputFile } from 'grammy';
import { giveFriendReward } from '../helpers/checkTasks';
import { User } from '../models/user';
import { mainText } from '../texts';

export interface KissGenerationTask {
  userId: number;
  chatId: number;
  messageId: number; // reply_to_message_id
  photoUrls: [string, string];
  taskId: string; // от NanoBananaAPI
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
}

const POLL_INTERVAL = 8000;

export async function startKissPollingWorker() {
  console.log('Kiss polling worker started');

  setInterval(async () => {
    try {
      const taskIds = await redis.smembers('kiss:active_tasks');
      if (taskIds.length === 0) return;

      for (const taskId of taskIds) {
        const raw = await redis.get(`kiss:task:${taskId}`);
        if (!raw) {
          await redis.srem('kiss:active_tasks', taskId);
          continue;
        }

        const task = JSON.parse(raw);
        if (task.status !== 'pending') continue;

        try {
          const status = await nanoAPI.getTaskStatus(taskId);

          // @ts-ignore — successFlag есть
          switch (status.data?.successFlag) {
            case 0:
              // в процессе
              break;

            case 1:
              //@ts-ignore
              const imageUrl = status.data.response.resultImageUrl;
              await sendResult(task, imageUrl);
              await finishTask(taskId, task, 'completed');
              break;

            case 2:
            case 3:
              await sendError(task, status.errorMessage || 'Generation failed');
              await finishTask(taskId, task, 'failed');
              break;
          }
        } catch (err) {
          console.error(`Polling error for task ${taskId}:`, err);
          // Не удаляем — попробуем снова
        }
      }
    } catch (err) {
      console.error('Polling worker error:', err);
    }
  }, POLL_INTERVAL);
}

async function sendResult(task: any, imageUrl: string) {
  try {
    await bot.api.sendPhoto(task.chatId, new InputFile({ url: imageUrl }), {
      reply_to_message_id: task.messageId,
    });

    const user = await User.findOne({ telegram_id: task.userId });
    if (user) await giveFriendReward(bot.api, user);

    await bot.api.sendMessage(task.chatId, mainText(user.generations));
  } catch (error) {}
}

async function sendError(task: any, message: string) {
  await bot.api.sendMessage(
    task.chatId,
    `Ошибка генерации: ${message}\n\nПопробуйте позже.`,
    { reply_to_message_id: task.messageId }
  );
}

async function finishTask(
  taskId: string,
  task: any,
  status: 'completed' | 'failed'
) {
  task.status = status;
  await redis.set(`kiss:task:${taskId}`, JSON.stringify(task), 'EX', 86400);
  await redis.srem('kiss:active_tasks', taskId);
}
