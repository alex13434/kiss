import { AdRef, IAdRef } from '../models/adRef';
import { User } from '../models/user';
import { MyContext } from '../typings/context';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const refText = (ref: IAdRef, newUsersCount: number) => `
📢 Реферал <b>${ref.name}</b>

<blockquote>🟢 Переходов: <b>${ref.count}</b></blockquote>
<blockquote>🐼 Уникальных: <b>${newUsersCount}</b> (${((newUsersCount / ref.count) * 100).toFixed(1)} %)</blockquote>

📅 Дата создания: <b>${format(new Date(ref.createdAt), 'HH:mm dd.MM.yyyy', { locale: ru })}</b>
`;

export const checkRef = async (ctx: MyContext) => {
  const refName = ctx.message.text.split('ref ')[1];
  console.log(refName);
  const ref = await AdRef.findOne({ name: refName });

  if (ref) {
    const newUsersCount = await User.countDocuments({ ref_name: refName });

    await ctx.api.sendMessage(ctx.chat.id, refText(ref, newUsersCount));
  } else {
    await ctx.api.sendMessage(
      ctx.chat.id,
      `<b>Такой рефереальной ссылки нет =(</b>`
    );
  }
};
