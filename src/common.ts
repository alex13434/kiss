import { InlineKeyboard } from 'grammy';
import config from './typings/config';

export const FRIENDREWARD = 3;
export const FREEGAMECOOLDOWN = 15 * 60;
export const GAMESREWARD = 5;
export const GAMESTOCD = 4;
export const ACTIVETASKSTIME = 10 * 60;
export const CHATGAMECOOLDOWN = 60 * 60 * 24;

export const PREMINDEX = 4;
export const WINVALUES = [4, 5];
export const DICE = '🏀';
export const GROUPCOMMAND = 'basket';

// generations : cost
export const items: Record<number, number[]> = {
  0: [1, 5],
  1: [10, 40],
  2: [50, 150],
  3: [500, 1000],
};

export const getGenEnding = (days: number) => {
  if (days % 10 === 1 && days % 100 !== 11) {
    return 'генерация';
  } else if (
    [2, 3, 4].includes(days % 10) &&
    ![12, 13, 14].includes(days % 100)
  ) {
    return 'генерации';
  } else {
    return 'генераций';
  }
};

export const donate_kb = (user_id: number) => {
  const keyboard = new InlineKeyboard();

  Object.entries(items).forEach(([key, [gens, cost]], index) => {
    const text = `🔥 ${gens} ${getGenEnding(gens)} - ${cost} ⭐️`;

    keyboard.text(text, `buy_gens_${key}`).row();
  });

  keyboard.copyText(
    `📨 Пригласить друга`,
    `https://t.me/${config.BOT_USERNAME}?start=R_${user_id}`
  );

  return keyboard;
};

export const pCommands = [
  { command: '/start', description: '😘 Создать поцелуй' },
  { command: '/bonus', description: '🔥 Генерации за друзей' },
];

export const acceptRulesKB = new InlineKeyboard().text(
  'все понятно 👍',
  'accept_rules'
);

export const invite_menu_kb = (user_id: number) =>
  new InlineKeyboard()
    .url(
      '➡️ Отправить другу',
      `https://t.me/share/url?url=https://t.me/${config.BOT_USERNAME}?start=R_${user_id}`
    )
    .row()
    .copyText(
      '🔗 Скопировать ссылку',
      `https://t.me/${config.BOT_USERNAME}?start=R_${user_id}`
    );

export const addToChatKeyboard = new InlineKeyboard().url(
  '⊕ сыграть в чате',
  `https://t.me/${config.BOT_USERNAME}?startgroup`
);

export const goToBotKeyboard = new InlineKeyboard().url(
  '🏀 играть за подарки 🎁',
  `https://t.me/${config.BOT_USERNAME}?start`
);

// admin
export const cancel_add_meme_conv_kb = new InlineKeyboard().text(
  '❌ Отменить',
  'cancel_add_meme_conv'
);

export const cancel_mail_conv_kb = new InlineKeyboard().text(
  '❌ Отменить',
  'cancel_mail_conv'
);

export const cancel_mailing_kb = new InlineKeyboard().text(
  '❌ Отменить',
  'cancel_mailing'
);

export const pause_mailing_kb = new InlineKeyboard()
  .text('⏸ Пауза', 'pause_mailing')
  .text('❌ Отменить', 'cancel_mailing');

export const resume_mailing_kb = new InlineKeyboard()
  .text('▶️ Возобновить', 'resume_mailing')
  .text('❌ Отменить', 'cancel_mailing');

export const start_mail_conv_kb = new InlineKeyboard()
  .text('✅ Старт', 'go_mail_conv')
  .text('❌ Отменить', 'cancel_mail_conv');

export const choise_rec_kb = new InlineKeyboard()
  .text('Юзеры', 'choise_users')
  .text('Группы', 'choise_groups')
  .text('Все', 'choise_all')
  .row()
  .text('❌ Отменить', 'cancel_mail_conv');

export const get_file_kb = new InlineKeyboard()
  .text('📄 .txt', 'get_file')
  .text('📊 Рефы', 'ref_menu');
