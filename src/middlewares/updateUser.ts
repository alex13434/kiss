import { Middleware } from 'grammy';
import { MyContext } from '../typings/context';
import { IUser, User } from '../models/user';
import { saveModifier } from '../helpers/saveModifier';
import { normalizeName } from '../helpers/normalizeName';

export const updateUser: Middleware<MyContext> = async (ctx, next) => {
  let user: IUser =
    ctx.session.user ?? (await User.findOne({ telegram_id: ctx.from?.id }));
  ctx.session.isFreshUser = false;

  if (!user && ctx.from) {
    ctx.session.isFreshUser = true;
    user = new User();
    user.telegram_id = ctx.from?.id;
    user.language_code = ctx.from?.language_code;
    user.is_premium = ctx.from.is_premium;
    ctx.chat?.type == 'private' ? (user.status = 1) : (user.status = 2);
    if (ctx.chat?.type == 'group' || ctx.chat?.type == 'supergroup')
      user.groups = ctx.chat ? [ctx.chat.id] : [];
    if (
      ctx.message?.text?.split(' ')[0].includes('/start') &&
      ctx.chat?.type == 'private'
    )
      user.ref_name = ctx.message.text.split(' ')[1];
  } else {
    if (ctx.chat?.type == 'group' || ctx.chat?.type == 'supergroup') {
      if (!user.groups) {
        user.groups = [];
      }

      const isInGroup = user.groups.includes(ctx.chat?.id);

      if (ctx.chat && !isInGroup) {
        await User.updateOne(
          { telegram_id: ctx.from?.id },
          { $addToSet: { groups: ctx.chat.id } }
        );
        user.groups.push(ctx.chat.id);
      }
    }
  }

  const { first_name = '', last_name = '', username = '' } = ctx.from;
  const validatedFirstName = normalizeName(first_name);
  const validatedLastName = normalizeName(last_name);

  const updatedFields: Partial<IUser> = {};
  if (user.first_name !== validatedFirstName)
    updatedFields.first_name = validatedFirstName;
  if (user.last_name !== validatedLastName)
    updatedFields.last_name = validatedLastName;
  if (user.username !== username) updatedFields.username = username;
  if (user.language_code !== ctx.from.language_code)
    updatedFields.language_code = ctx.from.language_code;
  if (user.is_premium !== ctx.from.is_premium)
    updatedFields.is_premium = ctx.from.is_premium;
  if (user.status == 2 && ctx.chat?.type == 'private') updatedFields.status = 1;

  user.first_name = validatedFirstName;
  user.last_name = validatedLastName;
  user.username = username;

  if (Object.keys(updatedFields).length) {
    Object.assign(user, updatedFields);
    if (!ctx.session.isFreshUser) {
      await User.updateOne({ telegram_id: ctx.from?.id }, updatedFields);
    }
  }

  if (ctx.session.isFreshUser) {
    if (user instanceof User) {
      await saveModifier(user);
    }
  }

  ctx.session.user = user;

  return next();
};
