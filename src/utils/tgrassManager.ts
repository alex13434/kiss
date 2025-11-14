// tgrassManager.ts
import axios from 'axios';
import { MyContext } from '../typings/context';
import config from '../typings/config';

interface TgrassOffers {
  tg_user_id: number;
  is_premium: boolean;
  lang: string;
}

export const getTgrassTasks = async (ctx: MyContext) => {
  const reqData: TgrassOffers = {
    tg_user_id: ctx.from.id,
    is_premium: ctx.from.is_premium || false,
    lang: ctx.from.language_code,
  };

  try {
    const { data } = await axios.post('https://tgrass.space/offers', reqData, {
      headers: {
        'Content-Type': 'application/json',
        Auth: config.TGRASS_KEY,
      },
    });
    return data.offers || [];
  } catch (error: any) {
    console.error('Error fetching tgrass tasks:', error.response.data);
    return [];
  }
};

export const checkTgrassSubscribes = async (ctx: MyContext) => {
  const reqData: TgrassOffers = {
    tg_user_id: ctx.from.id,
    is_premium: ctx.from.is_premium,
    lang: ctx.from.language_code,
  };

  try {
    const { data } = await axios.post('https://tgrass.space/offers', reqData, {
      headers: {
        'Content-Type': 'application/json',
        Auth: config.TGRASS_KEY,
      },
    });
    console.log(data);

    let isSubscribed = true;
    const tasks = data.offers || [];

    if (tasks) {
      isSubscribed = tasks.every((item: any) => item.subscribed === true);
    }

    return isSubscribed;
  } catch (error) {
    console.error('Error checking tgrass subscriptions:', error);
    return false;
  }
};
