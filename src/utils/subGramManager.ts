import axios from 'axios';
import { MyContext } from '../typings/context';
import config from '../typings/config';

interface subGramGetTasks {
  UserId: number;
  ChatId: number;
  first_name: string;
  language_code: string;
  Premium: boolean;
  MaxOP: number;
  action: string;
}

interface subGramCheckTasks {
  user_id: number;
  links?: string[];
}

export const getSubGramTasks = async (ctx: MyContext) => {
  const reqData: subGramGetTasks = {
    UserId: ctx.from.id,
    ChatId: ctx.chat.id,
    first_name: ctx.from.first_name,
    language_code: ctx.from.language_code,
    Premium: ctx.from.is_premium,
    MaxOP: 10,
    action: 'subscribe',
  };
  try {
    const { data } = await axios.post(
      'https://api.subgram.ru/request-op',
      reqData,
      {
        headers: {
          Auth: config.SUBGRAM_KEY,
        },
      }
    );
    return data.additional?.sponsors;
  } catch (error) {
    return [];
  }
};

export const checkSubGramSubscribes = async (
  ctx: MyContext,
  links: string[]
) => {
  const reqData: subGramCheckTasks = {
    user_id: ctx.from.id,
    links: links,
  };
  const { data } = await axios.post(
    'https://api.subgram.ru/get-user-subscriptions',
    reqData,
    {
      headers: {
        Auth: config.SUBGRAM_KEY,
      },
    }
  );

  let isSubscribed = true;
  const tasks = data.additional?.sponsors;

  if (tasks) {
    isSubscribed = tasks.every((item: any) => item.status !== 'unsubscribed');
  }

  return isSubscribed;
};
