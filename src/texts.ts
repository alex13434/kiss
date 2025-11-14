import { DICE, FRIENDREWARD, GAMESREWARD, items, WINVALUES } from './common';
import { IUser } from './models/user';
import config from './typings/config';

export function formatNumber(num: number) {
  return num.toLocaleString('en-US');
}
export const rulesText = `<i>получай</i> <b>телеграм-подарки</b>
<i>за каждую победу!</i> 🏆

🏀 <b>обычный бросок</b>
<i>подарок за</i> <b>15</b> ⭐️ — 🧸💝

💎🏀 <b>премиум-бросок</b>
<i>подарок за</i> <b>25</b> ⭐️ — 🎁🌹`;

const getHoursEnding = (hours: number) => {
  const intHours = Math.floor(hours);
  if (intHours % 10 === 1 && intHours % 100 !== 11) {
    return 'час';
  } else if (
    [2, 3, 4].includes(intHours % 10) &&
    ![12, 13, 14].includes(intHours % 100)
  ) {
    return 'часа';
  } else {
    return 'часов';
  }
};

const getMinutesEnding = (hours: number) => {
  const intHours = Math.floor(hours);
  if (intHours % 10 === 1 && intHours % 100 !== 11) {
    return 'минута';
  } else if (
    [2, 3, 4].includes(intHours % 10) &&
    ![12, 13, 14].includes(intHours % 100)
  ) {
    return 'минуты';
  } else {
    return 'минут';
  }
};

const getSecondsEnding = (hours: number) => {
  const intHours = Math.floor(hours);
  if (intHours % 10 === 1 && intHours % 100 !== 11) {
    return 'секунда';
  } else if (
    [2, 3, 4].includes(intHours % 10) &&
    ![12, 13, 14].includes(intHours % 100)
  ) {
    return 'секунды';
  } else {
    return 'секунд';
  }
};

export const mainText =
  '📸 Отправь <b>2 фото одним сообщением</b> — я создам изображение, где эти люди целуются 💋';

export const friendsText = `<b>🔥 Бесплатные генерации</b>\n\n<blockquote>💡 Получайте <b>+2 генерации</b> за каждого приглашенного друга, который создаст фото.</blockquote>`;

export const retryGameText = `🟡 <i>в этот раз не вышло,
сыграем еще раз?</i>`;

export const invoiceText = `получай подарок 🎁 за попадание в кольцо`;
export const invoicePlusText = `получай крутой подарок 🎁 за попадание в кольцо`;

export const subText = `<b>Для генерации подпишитесь на спонсоров</b>`;

export const retryGameGroupText = (win: boolean) => {
  if (win) {
    return `✅ <b>попал в кольцо!</b>`;
  } else {
    return `🟡 <i>в этот раз не вышло =(</i>`;
  }
};

export const groupTimeLeftText = (ttl: number) => {
  const hours = Math.floor(ttl / (60 * 60));
  const minutes = Math.floor((ttl % (60 * 60)) / 60);
  const seconds = ttl % 60;

  const hoursText = hours > 0 ? `${hours} ${getHoursEnding(hours)}` : '';
  const minutesText =
    minutes > 0 ? `${minutes} ${getMinutesEnding(minutes)}` : '';
  const secondsText =
    seconds > 0 ? `${seconds} ${getSecondsEnding(seconds)}` : '';

  const timeParts = [hoursText, minutesText, secondsText].filter(
    part => part !== ''
  );
  const timeString =
    timeParts.length > 0 ? timeParts.join(' ') : 'меньше секунды';

  return `🏀 <i>до следующего броска осталось
<blockquote><b>${timeString}</b></blockquote></i>`;
};

const winResultText = '<i><b>✅ попал!</b></i>';
const loseResultText = '<i><b>❌ промах</b></i>';

export const resultPlayText = (i: number, value: number) =>
  `${WINVALUES.includes(value) ? winResultText : loseResultText}\n`;

export const rewardForFriendText = `<blockquote>🎉 вы получили <b>вознаграждение ⭐️ ${FRIENDREWARD}</b> за приглашение друга!</blockquote>`;

export const addToChatText = `<blockquote>👥 <b>скорее добавляй меня в чат,
будем бросать мяч вместе!</b></blockquote>`;

export const inviteFriendText = (
  user: IUser
) => `<blockquote>🔗 по вашей ссылке перешёл <b><a href="https://t.me/${user.username}">${user.first_name}</a></b>,
после того как он сыграет ${GAMESREWARD} раз в баскет вы получите <b>⭐️ ${FRIENDREWARD}</b> на баланс</blockquote>`;

export function groupStartText() {
  return `✋ Привет, я работаю только в личных сообщениях!`;
}

// admin
export const languageToFlag: { [key: string]: string } = {
  aa: '🇪🇹',
  ab: '🇬🇪',
  af: '🇿🇦',
  ak: '🇬🇭',
  am: '🇪🇹',
  ar: '🇸🇦',
  as: '🇮🇳',
  av: '🇷🇺',
  ay: '🇧🇴',
  az: '🇦🇿',
  ba: '🇷🇺',
  be: '🇧🇾',
  bg: '🇧🇬',
  bh: '🇮🇳',
  bi: '🇻🇺',
  bm: '🇲🇱',
  bn: '🇧🇩',
  bo: '🇨🇳',
  br: '🇫🇷',
  bs: '🇧🇦',
  ca: '🇪🇸',
  ce: '🇷🇺',
  ch: '🇬🇺',
  co: '🇫🇷',
  cr: '🇨🇦',
  cs: '🇨🇿',
  cu: '🇧🇬',
  cv: '🇷🇺',
  cy: '🇬🇧',
  da: '🇩🇰',
  de: '🇩🇪',
  dv: '🇲🇻',
  dz: '🇧🇹',
  ee: '🇬🇭',
  el: '🇬🇷',
  en: '🇺🇸',
  eo: '🏳️',
  es: '🇪🇸',
  et: '🇪🇪',
  eu: '🇪🇸',
  fa: '🇮🇷',
  ff: '🇸🇳',
  fi: '🇫🇮',
  fj: '🇫🇯',
  fo: '🇫🇴',
  fr: '🇫🇷',
  fy: '🇳🇱',
  ga: '🇮🇪',
  gd: '🇬🇧',
  gl: '🇪🇸',
  gn: '🇵🇾',
  gu: '🇮🇳',
  gv: '🇮🇲',
  ha: '🇳🇬',
  he: '🇮🇱',
  hi: '🇮🇳',
  ho: '🇵🇬',
  hr: '🇭🇷',
  ht: '🇭🇹',
  hu: '🇭🇺',
  hy: '🇦🇲',
  hz: '🇳🇦',
  ia: '🏳️',
  id: '🇮🇩',
  ie: '🏳️',
  ig: '🇳🇬',
  ii: '🇨🇳',
  ik: '🇺🇸',
  io: '🏳️',
  is: '🇮🇸',
  it: '🇮🇹',
  iu: '🇨🇦',
  ja: '🇯🇵',
  jv: '🇮🇩',
  ka: '🇬🇪',
  kg: '🇨🇩',
  ki: '🇰🇪',
  kj: '🇳🇦',
  kk: '🇰🇿',
  kl: '🇬🇱',
  km: '🇰🇭',
  kn: '🇮🇳',
  ko: '🇰🇷',
  kr: '🇳🇬',
  ks: '🇮🇳',
  ku: '🇹🇷',
  kv: '🇷🇺',
  kw: '🇬🇧',
  ky: '🇰🇬',
  la: '🇻🇦',
  lb: '🇱🇺',
  lg: '🇺🇬',
  li: '🇳🇱',
  ln: '🇨🇩',
  lo: '🇱🇦',
  lt: '🇱🇹',
  lu: '🇨🇩',
  lv: '🇱🇻',
  mg: '🇲🇬',
  mh: '🇲🇭',
  mi: '🇳🇿',
  mk: '🇲🇰',
  ml: '🇮🇳',
  mn: '🇲🇳',
  mr: '🇮🇳',
  ms: '🇲🇾',
  mt: '🇲🇹',
  my: '🇲🇲',
  na: '🇳🇷',
  nb: '🇳🇴',
  nd: '🇿🇼',
  ne: '🇳🇵',
  ng: '🇳🇦',
  nl: '🇳🇱',
  nn: '🇳🇴',
  no: '🇳🇴',
  nr: '🇿🇦',
  nv: '🇺🇸',
  ny: '🇲🇼',
  oc: '🇫🇷',
  oj: '🇨🇦',
  om: '🇪🇹',
  or: '🇮🇳',
  os: '🇬🇪',
  pa: '🇮🇳',
  pi: '🇮🇳',
  pl: '🇵🇱',
  ps: '🇦🇫',
  pt: '🇧🇷',
  qu: '🇵🇪',
  rm: '🇨🇭',
  rn: '🇧🇮',
  ro: '🇷🇴',
  ru: '🇷🇺',
  rw: '🇷🇼',
  sa: '🇮🇳',
  sc: '🇮🇹',
  sd: '🇵🇰',
  se: '🇳🇴',
  sg: '🇨🇫',
  si: '🇱🇰',
  sk: '🇸🇰',
  sl: '🇸🇮',
  sm: '🇼🇸',
  sn: '🇿🇼',
  so: '🇸🇴',
  sq: '🇦🇱',
  sr: '🇷🇸',
  ss: '🇸🇸',
  st: '🇱🇸',
  su: '🇮🇩',
  sv: '🇸🇪',
  sw: '🇰🇪',
  ta: '🇱🇰',
  te: '🇮🇳',
  tg: '🇹🇯',
  th: '🇹🇭',
  ti: '🇪🇷',
  tk: '🇹🇲',
  tl: '🇵🇭',
  tn: '🇧🇼',
  to: '🇹🇴',
  tr: '🇹🇷',
  ts: '🇿🇦',
  tt: '🇷🇺',
  tw: '🇬🇭',
  ty: '🇵🇫',
  ug: '🇨🇳',
  uk: '🇺🇦',
  ur: '🇵🇰',
  uz: '🇺🇿',
  ve: '🇿🇦',
  vi: '🇻🇳',
  vo: '🏳️',
  wa: '🇧🇪',
  wo: '🇸🇳',
  xh: '🇿🇦',
  yi: '🇮🇱',
  yo: '🇳🇬',
  za: '🇨🇳',
  zh: '🇨🇳',
  zu: '🇿🇦',
  unknown: '🏳️',
};

export const statInfoText = (
  users: number,
  aliveUsers: number,
  deadUsers: number,
  groups: number,
  aliveGroups: number,
  totalMemberCount: number,
  todayStats: { users: number; groups: number },
  selfGrowth: { users: number; groups: number }
) => {
  return `<b>Общая статистика</b>

👤 <b>Юзеры: ${formatNumber(users)}</b>
🟢 Живых: ${formatNumber(aliveUsers)}
🔴 Мёртвых: ${formatNumber(deadUsers)}

💬 <b>Группы: ${formatNumber(groups)}</b>
🟢 Живых: ${formatNumber(aliveGroups)}
🔴 Мертвых: ${formatNumber(groups - aliveGroups)}
🔸 Участников: ${formatNumber(totalMemberCount)}

<b>За сегодня</b>
🟢 +${formatNumber(todayStats.users)} | 💬 +${formatNumber(todayStats.groups)}

<b>Саморост</b>
🟢 +${formatNumber(selfGrowth.users)} | 💬 +${formatNumber(selfGrowth.groups)}`;
};
