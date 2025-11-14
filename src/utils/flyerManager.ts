import axios from 'axios';
import { MyContext } from '../typings/context';
import config from '../typings/config';

interface flyerGetTasks {
  key: string;
  user_id: number;
  language_code: string;
  limit: number;
}

interface flyerCheckTask {
  key: string;
  user_id: number;
  signature: string;
}

export const getFlyerTasks = async (ctx: MyContext) => {
  const reqData: flyerGetTasks = {
    key: config.FLYER_KEY,
    user_id: ctx.from.id,
    language_code: ctx.from.language_code,
    limit: 10,
  };
  try {
    const { data } = await axios.post(
      'https://api.flyerservice.io/get_tasks',
      reqData
    );
    console.log('DATA', data);
    // Filter out tasks where is_ios_ban is true
    const filteredTasks = data.result.filter(
      (task: any) => task.is_ios_ban === false
    );
    return filteredTasks;
  } catch (error) {
    return [];
  }
};

export const checkFlyerSubscribes = async (ctx: MyContext) => {
  const tasks = await getFlyerTasks(ctx);
  let isAllSubs = true;

  const checkPromises = tasks.map(async (task: any) => {
    const reqData: flyerCheckTask = {
      key: config.FLYER_KEY,
      user_id: ctx.from.id,
      signature: task.signature,
    };

    const { data } = await axios.post(
      'https://api.flyerservice.io/check_task',
      reqData
    );

    return {
      signature: task.signature,
      link: task.link,
      task: task.task,
      status: data.result,
    };
  });

  const checkedTasks = await Promise.all(checkPromises);
  isAllSubs = !checkedTasks.some(item => item.status === 'incomplete');

  return { isAllSubs, checkedTasks };
};
