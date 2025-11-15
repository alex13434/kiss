import { getGenEnding, items } from '../common';
import { User } from '../models/user';
import { MyContext } from '../typings/context';
import { processKissAlbum } from './mediaHandler';

export const preCheckoutQueryHandler = async (ctx: MyContext) => {
  await ctx.answerPreCheckoutQuery(true);
};

export const successfulPaymentHandler = async (ctx: MyContext) => {
  const genIndex = Number(
    ctx.message.successful_payment.invoice_payload.split('genIndex_')[1]
  );
  const { generations } = await User.findOneAndUpdate(
    { telegram_id: ctx.from.id },
    { $inc: { generations: items[genIndex][0] } }
  );
  await ctx.api.sendMessage(
    ctx.chat.id,
    `<b>Успешно 🎉</b>

<b>+${items[genIndex][0]} ${getGenEnding(items[genIndex][0])}</b> 🔥 

У вас сейчас <b>${generations + items[genIndex][0]} ${getGenEnding(generations + items[genIndex][0])}</b> на балансе!`
  );
  await processKissAlbum(ctx);
};

export const buyGensCQ = async (ctx: MyContext) => {
  const genIndex = Number(ctx.callbackQuery.data.split('buy_gens_')[1]);
  await ctx.api.sendInvoice(
    ctx.chat.id,
    `Покупка генераций`,
    `+${items[genIndex][0]} ${getGenEnding(items[genIndex][0])} 🔥 на баланс`,
    `genIndex_${genIndex}`,
    'XTR',
    [
      {
        label: `${items[genIndex][0]} ${getGenEnding(items[genIndex][0])} 🔥`,
        amount: items[genIndex][1],
      },
    ],
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: `Купить за ⭐ ${items[genIndex][1]}`, pay: true }],
        ],
      },
    }
  );
};
