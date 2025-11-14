import { Middleware } from 'grammy';
import { MyContext } from '../typings/context';
import { Group } from '../models/group';

export const refGroup: Middleware<MyContext> = async (ctx, next) => {
  if (ctx.chat?.type != 'group' && ctx.chat?.type != 'supergroup')
    return next();

  const splitBySpace = ctx.message?.text?.split(' ');
  if (!splitBySpace || !splitBySpace[0].startsWith('/start')) return next();

  await next();

  const refName = splitBySpace[1];
  const group = await Group.findOne({ group_id: ctx.chat.id });
  if (group.ref_name == 'default') {
    await Group.updateOne({ group_id: ctx.chat.id }, { ref_name: refName });
  }
};
