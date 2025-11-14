import { redis } from '../bot';
import { Group } from '../models/group';
import { User } from '../models/user';
import { groupStartText } from '../texts';
import { MyContext } from '../typings/context';

export const chatMember = async (ctx: MyContext) => {
  const status = ctx.update.my_chat_member.new_chat_member.status;
  const statusIndex: Record<string, number> = {
    member: 1,
    left: 0,
    kicked: 0,
  };
  const from_id = ctx.update.my_chat_member.from.id;
  const chat_id = ctx.update.my_chat_member.chat.id;
  const chat_type = ctx.update.my_chat_member.chat.type;
  if (chat_type == 'private') {
    await User.updateOne(
      { telegram_id: from_id },
      { status: statusIndex[status] }
    );
  } else if (chat_type == 'supergroup' || chat_type == 'group') {
    if (status == 'member') {
      await redis.set(`groupStart:${ctx.chat.id}`, 1);
      await ctx.api.sendMessage(ctx.chat.id, groupStartText());
    }
    await Group.updateOne(
      { group_id: chat_id },
      { status: statusIndex[status] }
    );
  }
};
