import { InlineKeyboard } from 'grammy';
import {
  MyContext,
  MyConversation,
  MyConversationContext,
} from '../typings/context';
import { AdRef, IAdRef } from '../models/adRef';
import { saveModifier } from '../helpers/saveModifier';
import { User } from '../models/user';
import { Group } from '../models/group';
import { EditOrSend } from '../helpers/EditOrSend';
import { getStats } from './statisctics';
import { get_file_kb } from '../common';
import { languageToFlag, statInfoText } from '../texts';
import config from '../typings/config';

const refText = () => {
  return `<b>Рефералы</b>`;
};

const refInfoText = (
  name: string,
  type: string,
  price: number,
  users: number,
  aliveUsers: number,
  playedUsers: number,
  groups: number,
  totalUserGroups: number,
  gamesPlayed: { _id: string; totalPlayed: number }[],
  languageStats: { code: string; percent: number }[],
  totalClicks: number
) => {
  const languagesText =
    languageStats.length > 0
      ? languageStats
          .map(
            lang =>
              `${languageToFlag[lang.code] || languageToFlag['unknown']} ${lang.code}: ${lang.percent.toFixed(1)}%`
          )
          .join('\n')
      : 'Нет данных о языках';

  const gamesPlayedText =
    gamesPlayed.length > 0
      ? gamesPlayed
          .map(game => `Игра ${game._id}: ${game.totalPlayed}`)
          .join('\n')
      : 'Нет данных об играх';

  return `Реферал <b>${name}</b>
<code>··············</code>
${type == 'mail' ? 'Цена' : 'Цена за пдп'}: ${price}₽
<code>··············</code>
Переходов: ${totalClicks}
Уникальных: ${users}
Живых: ${aliveUsers} (${((aliveUsers / users) * 100).toFixed(1)}%)
Прошли оп: ${playedUsers} (${((playedUsers / users) * 100).toFixed(1)}%)
<blockquote>${languagesText}</blockquote>
<code>··············</code>
Групп: ${groups}
Добавили групп: ${totalUserGroups}
<code>··············</code>
${gamesPlayedText}
<code>··············</code>
<code>https://t.me/${config.BOT_USERNAME}?start=${name}</code>
Всего: ${users + groups}
${type == 'sub' ? `<code>··············</code>\nСтоимость: ${Math.floor(price * (users + groups))}₽` : ''}`;
};

const cancel_add_new_ref_conv = new InlineKeyboard().text(
  '❌ Отменить',
  'cancel_add_new_ref_conv'
);

const back_ref_menu = new InlineKeyboard().text('« Назад', 'back_ref_menu');

const choose_type = new InlineKeyboard()
  .text('Рассылка', 'ref_type_mail')
  .text('ОП', 'ref_type_sub')
  .row()
  .text('❌ Отменить', 'cancel_add_new_ref_conv');

function refKeyboard(refs: IAdRef[]) {
  const keyboard = new InlineKeyboard();
  let count = 0;
  refs.forEach(ref => {
    count++;
    keyboard.text(ref.name, `ref-${ref.name}`);
    if (count == 4) {
      count = 0;
      keyboard.row();
    }
  });

  keyboard.text('Добавить рефку', 'add_new_ref').row();
  keyboard.text('« Назад', 'back_stats');

  return keyboard;
}

export const refMenuCQ = async (ctx: MyContext) => {
  const refferals = await AdRef.find().lean();
  const kb = refKeyboard(refferals);
  await EditOrSend(ctx, refText(), { reply_markup: kb });
};

export const addNewRefCQ = async (ctx: MyContext) => {
  await ctx.deleteMessage();
  await ctx.conversation.enter('addNewRefConv');
};

export const addNewRefConv = async (
  conversation: MyConversation,
  ctx: MyConversationContext
) => {
  const checkpoint1 = conversation.checkpoint();
  const message = await ctx.api.sendMessage(
    ctx.chat.id,
    'Напиши название новой рефки:',
    { reply_markup: cancel_add_new_ref_conv }
  );
  const name_ctx = await conversation.waitFor(':text');
  const adRef = await AdRef.findOne({ name: name_ctx.message.text }).lean();

  if (adRef) {
    await ctx.api.sendMessage(ctx.chat.id, 'Рефка с таким именем уже есть!');
    await conversation.rewind(checkpoint1);
  }
  await ctx.api.editMessageText(
    ctx.chat.id,
    message.message_id,
    'Выбери вид рекламы:',
    { reply_markup: choose_type }
  );
  const type_ctx = await conversation.waitForCallbackQuery(/^ref_type_/);
  const refType = type_ctx.update.callback_query.data.replace('ref_type_', '');

  const checkpoint2 = conversation.checkpoint();
  await ctx.api.editMessageText(
    ctx.chat.id,
    message.message_id,
    refType == 'mail' ? 'Введите цену:' : 'Введите цену за пдп:',
    { reply_markup: cancel_add_new_ref_conv }
  );
  const price_ctx = await conversation.waitFor(':text');
  const price = Number(price_ctx.message.text);
  if (Number.isNaN(price)) {
    await ctx.api.sendMessage(ctx.chat.id, 'Это не число!');
    await conversation.rewind(checkpoint2);
  }

  const newAdRef = new AdRef();
  newAdRef.name = name_ctx.message.text;
  // @ts-ignore
  newAdRef.type = refType;
  newAdRef.price = price;
  await saveModifier(newAdRef);
  await ctx.api.deleteMessage(ctx.chat.id, message.message_id);
  await ctx.api.sendMessage(
    ctx.chat.id,
    `Рефка ${name_ctx.message.text} успешно добавлена!`
  );
};

export const cancelAddNewRefConvCQ = async (ctx: MyContext) => {
  await ctx.conversation.exit('addNewRefConv');
  await ctx.deleteMessage();
  await ctx.reply('Добавление рефки отменено!');
};

export const checkRefCQ = async (ctx: MyContext) => {
  const refName = ctx.callbackQuery.data.split('ref-')[1];
  const adRef = await AdRef.findOne({ name: refName });

  const [
    users,
    aliveUsers,
    playedUsers,
    groups,
    uniqueUserGroups,
    topLanguages,
    gamesPlayedStats,
  ] = await Promise.all([
    User.countDocuments({ ref_name: refName }),
    User.countDocuments({ ref_name: refName, status: 1 }),
    User.countDocuments({ ref_name: refName, completeFirstSubs: true }),
    Group.countDocuments({ ref_name: refName }),
    User.aggregate([
      { $match: { ref_name: refName } },
      { $unwind: { path: '$groups', preserveNullAndEmptyArrays: true } },
      { $match: { groups: { $ne: null } } },
      {
        $group: {
          _id: '$groups',
          count: { $sum: 1 },
        },
      },
      { $group: { _id: null, totalUniqueGroups: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { ref_name: refName } },
      {
        $group: {
          _id: '$language_code',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    User.aggregate([
      { $match: { ref_name: refName } },
      {
        $project: {
          gamesPlayed: { $objectToArray: '$gamesPlayed' },
        },
      },
      { $unwind: '$gamesPlayed' },
      {
        $group: {
          _id: '$gamesPlayed.k',
          totalPlayed: { $sum: '$gamesPlayed.v' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalUniqueGroupsCount =
    uniqueUserGroups.length > 0 ? uniqueUserGroups[0].totalUniqueGroups : 0;
  const totalUsers = users;

  const languageMap = new Map<string, number>();
  topLanguages.forEach(lang => {
    const code = languageToFlag[lang._id] ? lang._id : 'unknown';
    languageMap.set(code, (languageMap.get(code) || 0) + lang.count);
  });

  const knownCount = Array.from(languageMap.entries())
    .filter(([code]) => code !== 'unknown')
    .reduce((sum, [, count]) => sum + count, 0);
  const unknownCount = totalUsers - knownCount;

  const finalLanguageStats = Array.from(languageMap.entries())
    .filter(([code]) => code !== 'unknown')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code, count]) => ({
      code,
      percent: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
    }));

  if (unknownCount > 0) {
    finalLanguageStats.push({
      code: 'unknown',
      percent: totalUsers > 0 ? (unknownCount / totalUsers) * 100 : 0,
    });
  }

  await EditOrSend(
    ctx,
    refInfoText(
      refName,
      adRef.type,
      adRef.price,
      users,
      aliveUsers,
      playedUsers,
      groups,
      totalUniqueGroupsCount,
      gamesPlayedStats,
      finalLanguageStats,
      adRef.count
    ),
    { reply_markup: back_ref_menu }
  );
};

export const backRefMenuCQ = async (ctx: MyContext) => {
  const refferals = await AdRef.find().lean();
  const kb = refKeyboard(refferals);
  await EditOrSend(ctx, refText(), { reply_markup: kb });
};

export const backStatsCQ = async (ctx: MyContext) => {
  const stats = await getStats();

  const text = statInfoText(
    stats.users,
    stats.alive_users,
    stats.dead_users,
    stats.groups,
    stats.alive_groups,
    stats.total_member_count,
    { users: stats.users_today_alive, groups: stats.groups_today },
    {
      users: stats.self_growth_today_users,
      groups: stats.self_growth_today_groups,
    }
  );

  await EditOrSend(ctx, text, { reply_markup: get_file_kb });
};
