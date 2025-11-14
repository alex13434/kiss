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

export const pCommands = [
  { command: '/start', description: '🏀 сыграть в баскет' },
  { command: '/bonus', description: '🌟 бонус за друга' },
];

export const gCommands = [
  { command: '/basket', description: '🏀 сыграть в баскет' },
];

export const items: Record<number, number[]> = {
  0: [0, 6],
  1: [1, 5],
  2: [5, 2],
  3: [10, 1],
  4: [15, 1],
};

export const getDiceEnding = (days: number) => {
  if (days % 10 === 1 && days % 100 !== 11) {
    return 'мяч';
  } else if (
    [2, 3, 4].includes(days % 10) &&
    ![12, 13, 14].includes(days % 100)
  ) {
    return 'мяча';
  } else {
    return 'мячей';
  }
};

export const acceptRulesKB = new InlineKeyboard().text(
  'все понятно 👍',
  'accept_rules'
);

export const main_kb = () => {
  const keyboard = new InlineKeyboard();

  Object.entries(items).forEach(([key, [cost, balls]], index) => {
    const isFree = cost === 0;
    const emoji = isFree ? '🔥🏀' : key === `${PREMINDEX}` ? '💎🏀' : '🏀';
    const text = isFree
      ? `${emoji} ${balls} мячей • бесплатно`
      : `${emoji} ${balls} ${getDiceEnding(balls)} • ${cost} ⭐️`;
    const callback = `game_${key}`;

    if (index % 2 !== 0) {
      keyboard.text(text, callback);
      if (index == 0 || index == 5) {
        keyboard.row();
      }
    } else {
      keyboard.text(text, callback).row();
    }
  });

  // Add friends menu button
  keyboard.text(`+${FRIENDREWARD} ⭐️ за друга`, 'friends_menu');
  keyboard.url(`⚽️ футбол`, 'https://t.me/foot_gift_bot?start=basket');

  return keyboard;
};

export const invite_menu_kb = (user_id: number) =>
  new InlineKeyboard()
    .url(
      '➡️ отправить другу',
      `https://t.me/share/url?url=https://t.me/${config.BOT_USERNAME}?start=R_${user_id}`
    )
    .row()
    .copyText(
      'скопировать ссылку',
      `https://t.me/${config.BOT_USERNAME}?start=R_${user_id}`
    );

export const invite_kb = (user_id: number) =>
  new InlineKeyboard()
    .url(
      '➡️ отправить другу',
      `https://t.me/share/url?url=https://t.me/${config.BOT_USERNAME}?start=R_${user_id}`
    )
    .row()
    .copyText(
      'скопировать ссылку',
      `https://t.me/${config.BOT_USERNAME}?start=R_${user_id}`
    )
    .row()
    .text('« назад', `back_menu`);

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
