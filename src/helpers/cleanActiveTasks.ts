import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { redis } from '../bot';
import { IActiveTask } from '../utils/sendTasks';
import { ACTIVETASKSTIME } from '../common';
import { Api } from 'grammy';

const scheduler = new ToadScheduler();

export async function cleanActiveTasks(api: Api) {
  const task = new AsyncTask(
    'cleanActiveTasks',
    async () => {
      const tasksKeys = await redis.keys('activeTasks:*');
      for (const taskKey of tasksKeys) {
        //@ts-ignore
        const task: IActiveTask = await redis.hgetall(taskKey);
        if (!task) continue;

        const startTime = new Date(task.sentAt).getTime();
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;

        if (elapsedSeconds >= ACTIVETASKSTIME) {
          try {
            await api.deleteMessage(task.user_id, task.message_id);
          } catch (error) {}
          await redis.del(taskKey);
        }
      }
    },
    error => {
      console.error('Task failed:', error);
    }
  );

  const job = new SimpleIntervalJob({ seconds: 30 }, task);
  scheduler.addSimpleIntervalJob(job);
}

export function stopScheduler() {
  scheduler.stop();
}
