import mongoose, { connect } from 'mongoose';
import config from './typings/config';
import Redis from 'ioredis';
import { MyContext, SessionData } from './typings/context';
import { Bot, Context, session } from 'grammy';
import { run, sequentialize } from '@grammyjs/runner';
import { parseMode } from '@grammyjs/parse-mode';
import { conversations, createConversation } from '@grammyjs/conversations';
import { updateUser } from './middlewares/updateUser';
import { updateGroup } from './middlewares/updateGroup';
import { statistics } from './admin/statisctics';
import {
  cancelMailingConvCQ,
  cancelMailingCQ,
  initializeMailing,
  pauseMailingCQ,
  resumeExistingMailing,
  resumeMailingCQ,
  startMailConv,
} from './admin/mailing';
import { chatMember } from './helpers/chatMember';
import { getAllUsersFileCQ } from './admin/getAllUsersFile';
import {
  addNewRefConv,
  addNewRefCQ,
  backRefMenuCQ,
  backStatsCQ,
  cancelAddNewRefConvCQ,
  checkRefCQ,
  refMenuCQ,
} from './admin/refMenu';
import { refGroup } from './middlewares/refGroup';
import { friendsMenu, friendsMenuCQ } from './actions/friends';
import {
  backMenuCQ,
  gameCQ,
  preCheckoutQueryHandler,
  successfulPaymentHandler,
  resumeGame,
} from './actions/game';
import { checkButtonCQ } from './utils/taskManager';
import { startHandler } from './actions/startHandler';
import { addToChat } from './actions/addToChat';
import { cleanActiveTasks } from './helpers/cleanActiveTasks';
import {
  addResourceConv,
  cancelAddResourceCQ,
  checkSubsHandler,
  deleteResourceConv,
  viewResourceConv,
} from './admin/resources';
import { testFunc } from './actions/testFunc';
import { gCommands, GROUPCOMMAND, main_kb, pCommands } from './common';
import { refUser } from './middlewares/refUser';
import { groupStartText, mainText } from './texts';
import { IUser, User } from './models/user';
import { logError } from './utils/logger';
import { checkRef } from './admin/checkRef';
import { mediaHandler } from './actions/mediaHandler';

export const ADMIN_ID = 7371046616;

connect(config.MONGO_URI, {
  enableUtf8Validation: true,
  autoIndex: true,
})
  .then(() => {
    console.log('Successfully connected to MongoDB');
  })
  .catch(err => {
    logError(err);
  });

export const redis = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
});

redis.on('error', err => {
  logError(err);
});

export const bot = new Bot<MyContext>(config.BOT_TOKEN);

async function resumeActiveGames() {
  try {
    const keys = await redis.keys('gameState:*');

    for (const key of keys) {
      const userId = parseInt(key.split(':')[1]);
      const savedState = await redis.get(key);
      if (!savedState) continue;

      const gameState = JSON.parse(savedState);

      // Создаём контекст для пользователя
      const ctx: MyContext = {
        from: { id: userId, is_bot: false } as any,
        chat: { id: gameState.chatId, type: 'private' } as any,
        api: bot.api,
      } as MyContext;

      // Возобновляем игру
      await resumeGame(ctx, gameState);
    }
  } catch (error) {
    console.error('Ошибка при возобновлении активных игр:', error);
  }
}

function initial(): SessionData {
  return {};
}

function getSessionKey(ctx: Context) {
  return `${ctx.from?.id}`;
}

bot.api.setMyCommands(pCommands, { scope: { type: 'all_private_chats' } });
bot.api.setMyCommands(gCommands, { scope: { type: 'all_group_chats' } });

bot.api.config.use(parseMode('HTML'));
bot.use(sequentialize(ctx => String(ctx.chat?.id)));
bot.use(session({ initial, getSessionKey }));
bot.use(conversations());
bot.use(updateUser);
bot.use(updateGroup);
bot.use(refGroup);

bot.on('my_chat_member', chatMember);
bot.on('pre_checkout_query', preCheckoutQueryHandler);
const pBot = bot.chatType('private');

// CONVERSATIONS
pBot.use(createConversation(startMailConv, { parallel: true }));
pBot.use(createConversation(addNewRefConv, { parallel: true }));
pBot.use(createConversation(addResourceConv, { parallel: true }));
pBot.use(createConversation(viewResourceConv, { parallel: true }));
pBot.use(createConversation(deleteResourceConv, { parallel: true }));

pBot.use(refUser);
pBot.command('start', startHandler);
pBot.on(':media', mediaHandler);

pBot.callbackQuery('accept_rules', backMenuCQ);

pBot.callbackQuery(/^game_/, gameCQ);
pBot.callbackQuery('friends_menu', friendsMenuCQ);
pBot.callbackQuery('back_menu', backMenuCQ);
pBot.callbackQuery(/^check_subs_/, checkButtonCQ);
pBot.on(':successful_payment', successfulPaymentHandler);

// pBot.command('test', testFunc);

// admin
pBot.command('ref', checkRef);
pBot.command('add', async ctx => {
  await ctx.conversation.enter('addResourceConv');
});
pBot.command('check', checkSubsHandler);

pBot.callbackQuery('cancel_add_resource', cancelAddResourceCQ);
pBot.callbackQuery(/^resource_/, async ctx => {
  const resourceId = ctx.callbackQuery.data.split('_')[1];
  await ctx.conversation.enter('viewResourceConv', { resourceId });
});
pBot.callbackQuery(/^delete_resource_/, async ctx => {
  const resourceId = ctx.callbackQuery.data.split('_')[2];
  await ctx.conversation.enter('deleteResourceConv', { resourceId });
});

pBot.command('mail').filter(
  ctx => ctx.from.id == config.ADMIN_ID,
  ctx => ctx.conversation.enter('startMailConv')
);
pBot
  .command('resume_mail')
  .filter(ctx => ctx.from.id == config.ADMIN_ID, resumeExistingMailing);
pBot.command('adm').filter(ctx => ctx.from.id == config.ADMIN_ID, statistics);

pBot.callbackQuery('get_file', getAllUsersFileCQ);

pBot.callbackQuery('ref_menu', refMenuCQ);
pBot.callbackQuery('add_new_ref', addNewRefCQ);
pBot.callbackQuery(/^ref-/, checkRefCQ);
pBot.callbackQuery('cancel_add_new_ref_conv', cancelAddNewRefConvCQ);
pBot.callbackQuery('back_ref_menu', backRefMenuCQ);
pBot.callbackQuery('back_stats', backStatsCQ);

pBot.callbackQuery('cancel_mail_conv', cancelMailingConvCQ);
pBot.callbackQuery('cancel_mailing', cancelMailingCQ);
pBot.callbackQuery('pause_mailing', pauseMailingCQ);
pBot.callbackQuery('resume_mailing', resumeMailingCQ);

pBot.on('message', async ctx => {
  const user = await User.findOne({ telegram_id: ctx.from.id });
  ctx.reply(mainText(user.balance), {
    reply_markup: main_kb(),
    link_preview_options: { is_disabled: true },
  });
});

const gBot = bot.chatType(['supergroup', 'group']);

gBot.on('message', ctx => {
  if (ctx.message.reply_to_message.from.username === config.BOT_USERNAME) {
    ctx.reply(groupStartText());
  }
});

async function startBot() {
  try {
    await resumeActiveGames(); // Возобновляем активные игры
    await initializeMailing();
    run(bot);
    cleanActiveTasks(bot.api);
    bot.catch(async err => {
      logError(err.error, err.ctx);
    });
    process.on('uncaughtException', error => {
      logError(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logError(reason);
    });
    console.log('Bot is running');
  } catch (error) {
    console.error('Failed to start bot:', error);
  }
}

startBot();
