import { Middleware } from 'grammy';
import { MyContext } from '../typings/context';
import { AdRef } from '../models/adRef';
import { redis } from '../bot';

const COOLDOWN_SECONDS = 24 * 60 * 60;

export const refUser: Middleware<MyContext> = async (ctx, next) => {
  if (
    ctx.message?.text?.startsWith('/start') &&
    ctx.chat?.type === 'private' &&
    ctx.from?.id
  ) {
    const refName = ctx.message.text.split(' ')[1];

    if (refName) {
      const adRef = await AdRef.findOne({ name: refName });

      if (adRef) {
        const redisKey = `adref:${adRef._id}:user:${ctx.from.id}`;

        const isInCooldown = await redis.get(redisKey);

        if (!isInCooldown) {
          await AdRef.updateOne({ name: refName }, { $inc: { count: 1 } });

          await redis.set(redisKey, '1', 'EX', COOLDOWN_SECONDS);
        }
      }
    }
  }

  return next();
};
