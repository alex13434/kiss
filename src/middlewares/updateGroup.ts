import { Middleware } from "grammy";
import { MyContext } from "../typings/context";
import { Group, IGroup } from "../models/group";
import { saveModifier } from "../helpers/saveModifier";
import { normalizeName } from "../helpers/normalizeName";

export const updateGroup: Middleware<MyContext> = async (ctx, next) => {
    if (ctx.chat?.type != "group" && ctx.chat?.type != "supergroup") return next();

    let group: IGroup = await Group.findOne({ group_id: ctx.chat.id });
    let newGroup = false;

    if (!group) {
        group = new Group()
        newGroup = true;
        group.group_id = ctx.chat?.id;
        try {
            group.member_count = await ctx.api.getChatMemberCount(ctx.chat.id);
        } catch {}
    }

    if (ctx.update.my_chat_member && newGroup) {
        group.inviter_id = ctx.update.my_chat_member.from.id;
    }

    const { title, username } = ctx.chat ?? {};
    const normTitle = normalizeName(title);

    const updatedFields: Partial<IGroup> = {};
    if(normTitle !== group.title) updatedFields.title = normTitle;
    if(username !== group.username) updatedFields.username = username;

    group.title = normTitle;
    group.username = username;

    if (Object.keys(updatedFields).length) {
        Object.assign(group, updatedFields);
        if (!newGroup){
            await Group.updateOne({ group_id: ctx.chat.id }, updatedFields);
        }
    }

    if (newGroup) {
        if (group instanceof Group) {
            await saveModifier(group);
        }
    }

    return next()
}