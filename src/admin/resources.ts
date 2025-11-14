import { InlineKeyboard } from 'grammy';
import { IResource, Resource } from '../models/resource';
import { MyContext } from '../typings/context';
import axios from 'axios';

export async function addResourceConv(conversation: any, ctx: MyContext) {
  const cancelKeyboard = new InlineKeyboard().text(
    'Cancel',
    'cancel_add_resource'
  );

  await ctx.reply('Choose resource type:', {
    reply_markup: new InlineKeyboard()
      .text('Channel', 'type_channel')
      .text('Bot', 'type_bot')
      .row()
      .text('Cancel', 'cancel_add_resource'),
  });

  const typeAnswer = await conversation.waitForCallbackQuery(/^type_/);
  const resourceType = typeAnswer.update.callback_query.data.replace(
    'type_',
    ''
  );

  if (resourceType !== 'channel' && resourceType !== 'bot') {
    await ctx.reply('Invalid type selected!');
    return;
  }

  await typeAnswer.answerCallbackQuery();
  await ctx.deleteMessage();

  // Ask for name
  await ctx.reply('Please enter the resource name:', {
    reply_markup: cancelKeyboard,
  });
  const nameMsg = await conversation.waitFor('message:text');
  const name = nameMsg.message.text;

  // Ask for link
  await ctx.reply(
    'Please enter the resource link (e.g., @channel or https://t.me/...):',
    { reply_markup: cancelKeyboard }
  );
  const linkMsg = await conversation.waitFor('message:text');
  const input = linkMsg.message.text;
  const link = input.startsWith('@')
    ? `https://t.me/${input.slice(1)}`
    : input.startsWith('https://t.me/')
      ? input
      : `https://t.me/${input}`;

  // Ask for bot token if type is bot and validate it
  let token = '';
  if (resourceType === 'bot') {
    await ctx.reply('Please enter the bot token:', {
      reply_markup: cancelKeyboard,
    });
    const tokenMsg = await conversation.waitFor('message:text');
    token = tokenMsg.message.text;

    // Basic format validation
    if (!token.includes(':')) {
      await ctx.reply('Invalid bot token format! It should contain a colon.');
      return;
    }

    // Validate token with Telegram API
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${token}/getMe`
      );
      const botData = response.data;
      if (!botData.ok || !botData.result) {
        await ctx.reply(
          'Invalid bot token! Could not verify with Telegram API.'
        );
        return;
      }

      // Verify the bot username matches the provided link
      const botUsername = botData.result.username;
      const expectedUsername = link.includes('/')
        ? `${link.split('/').pop()}`
        : link;
      if (botUsername.toLowerCase() !== expectedUsername.toLowerCase()) {
        await ctx.reply(
          'The token does not belong to the bot with the provided link!'
        );
        return;
      }
    } catch (error) {
      await ctx.reply(
        `Error validating bot token: ${(error as Error).message}`
      );
      return;
    }
  }

  // Ask for max subscribes
  await ctx.reply('Please enter the maximum number of subscriptions:', {
    reply_markup: cancelKeyboard,
  });
  const maxSubsMsg = await conversation.waitFor('message:text');
  const maxSubscribes = parseInt(maxSubsMsg.message.text);

  if (isNaN(maxSubscribes) || maxSubscribes < 0) {
    await ctx.reply('Invalid number of maximum subscriptions!');
    return;
  }

  // Save to database
  try {
    const newResource = new Resource({
      name,
      link,
      type: resourceType,
      token,
      maxSubscribes,
    });
    await newResource.save();
    await ctx.reply(`Resource "${name}" added successfully!`);
  } catch (error) {
    await ctx.reply(`Error adding resource: ${(error as Error).message}`);
  }
}

export async function viewResourceConv(
  conversation: any,
  ctx: MyContext,
  { resourceId }: { resourceId: string }
) {
  try {
    const resource = await Resource.findById(resourceId).lean();

    if (!resource) {
      await ctx.reply('Resource not found!');
      return;
    }

    const resourceInfo = `
<b>Resource Details:</b>
Name: ${resource.name}
Link: ${resource.link}
Type: ${resource.type}
${resource.type === 'bot' && resource.token ? `Token: ${resource.token}\n` : ''}
Subscribers: ${resource.subscribes}/${resource.maxSubscribes}
Created: ${new Date(resource.createdAt).toLocaleDateString()}
    `;

    const keyboard = new InlineKeyboard()
      .text('Delete', `delete_resource_${resource._id}`)
      .text('Cancel', 'cancel_view_resource');

    await ctx.reply(resourceInfo, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    await conversation.waitForCallbackQuery(/^cancel_view_resource/);
    await ctx.deleteMessage();
    await ctx.reply('Operation cancelled!');
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.reply(`Error viewing resource: ${(error as Error).message}`);
  }
}

export async function deleteResourceConv(
  conversation: any,
  ctx: MyContext,
  { resourceId }: { resourceId: string }
) {
  try {
    const resource = await Resource.findById(resourceId).lean();

    if (!resource) {
      await ctx.reply('Resource not found!');
      return;
    }

    await ctx.reply(`Are you sure you want to delete "${resource.name}"?`, {
      reply_markup: new InlineKeyboard()
        .text('Confirm', 'confirm_delete')
        .text('Cancel', 'cancel_delete'),
    });

    const answer = await conversation.waitForCallbackQuery(
      /^confirm_delete|cancel_delete/
    );

    if (answer.update.callback_query.data === 'cancel_delete') {
      await ctx.deleteMessage();
      await ctx.reply('Deletion cancelled!');
      await ctx.answerCallbackQuery();
      return;
    }

    await Resource.findByIdAndDelete(resourceId);
    await ctx.deleteMessage();
    await ctx.reply(`Resource "${resource.name}" has been deleted!`);
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.reply(`Error deleting resource: ${(error as Error).message}`);
  }
}

export async function cancelAddResourceCQ(ctx: MyContext) {
  await ctx.conversation.exit('addResourceConv');
  await ctx.deleteMessage();
  await ctx.reply('Operation cancelled!');
  await ctx.answerCallbackQuery();
}

export async function checkSubsHandler(ctx: MyContext) {
  try {
    const resources = await Resource.find().lean();

    if (resources.length === 0) {
      await ctx.reply('No resources found!');
      return;
    }

    const keyboard = new InlineKeyboard();
    resources.forEach((resource: any, index: number) => {
      keyboard.text(resource.name, `resource_${resource._id}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });

    await ctx.reply('Select a resource to view details:', {
      reply_markup: keyboard,
    });
  } catch (error) {
    await ctx.reply(`Error fetching resources: ${(error as Error).message}`);
  }
}
