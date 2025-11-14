import { redis } from '../bot';
import {
  FREEGAMECOOLDOWN,
  FRIENDREWARD,
  GAMESREWARD,
  main_kb,
} from '../common';
import { IUser, User } from '../models/user';
import { mainText, rewardForFriendText, timeLeftText } from '../texts';
import { MyContext } from '../typings/context';
import { sendTasks } from '../utils/sendTasks';

export const checkTasks = async (ctx: MyContext) => {
  const result = await sendTasks(ctx);
  return result;
};

// export const giveFriendReward = async (ctx: MyContext, user: IUser) => {
//   if (user.totalGamesCount == GAMESREWARD) {
//     if (user.ref_name.startsWith('R_')) {
//       const inviter_id = user.ref_name.split('R_')[1];
//       await User.updateOne(
//         { telegram_id: inviter_id },
//         { $inc: { balance: FRIENDREWARD } }
//       );
//       await ctx.api.sendMessage(inviter_id, rewardForFriendText);
//     }
//   }
// };
