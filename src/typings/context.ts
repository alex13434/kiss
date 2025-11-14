import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { I18nFlavor } from '@grammyjs/i18n';
import { Context, SessionFlavor } from 'grammy';
import { IUser } from '../models/user';
import { IGroup } from '../models/group';

export interface SessionData {
  user?: IUser;
  group?: IGroup;
  isFreshUser?: boolean;
}

export type MyContext = Context &
  I18nFlavor &
  SessionFlavor<SessionData> &
  ConversationFlavor<Context>;

export type MyConversationContext = Context;

export type MyConversation = Conversation<MyContext, MyConversationContext>;
