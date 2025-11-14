import { MyContext } from '../typings/context';
import { User } from '../models/user';
import { Group } from '../models/group';
import { get_file_kb } from '../common';
import moment from 'moment-timezone';
import { statInfoText } from '../texts';

moment.tz.setDefault('Europe/Moscow');

export async function getStats() {
  const now = moment();
  const todayStart = now.clone().startOf('day').toDate();
  const todayEnd = now.clone().endOf('day').toDate();

  const [
    totalUsers,
    aliveUsers,
    deadUsers,
    todayAliveUsers,
    selfGrowthTodayUsers,
    totalGroups,
    aliveGroups,
    todayGroups,
    selfGrowthTodayGroups,
    totalMemberCount,
    totalUserGroups,
  ] = await Promise.all([
    // User counts
    User.countDocuments(),
    User.countDocuments({ status: 1 }),
    User.countDocuments({ status: 0 }),
    User.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: { $in: [0, 1] },
    }),
    User.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: { $in: [0, 1] },
      ref_name: 'default',
    }),
    // Group counts
    Group.countDocuments(),
    Group.countDocuments({ status: 1 }),
    Group.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Group.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      ref_name: 'default',
    }),
    // Total member count in groups
    Group.aggregate([
      { $match: { status: 1 } },
      { $group: { _id: null, totalMemberCount: { $sum: '$member_count' } } },
    ]).then(res => (res.length > 0 ? res[0].totalMemberCount : 0)),
    User.aggregate([
      {
        $group: {
          _id: null,
          totalGroups: { $sum: { $size: { $ifNull: ['$groups', []] } } },
        },
      },
    ]).then(res => (res.length > 0 ? res[0].totalGroups : 0)),
  ]);

  return {
    users: totalUsers,
    alive_users: aliveUsers,
    dead_users: deadUsers,
    users_today_alive: todayAliveUsers,
    groups: totalGroups,
    alive_groups: aliveGroups,
    groups_today: todayGroups,
    self_growth_today_users: selfGrowthTodayUsers,
    self_growth_today_groups: selfGrowthTodayGroups,
    total_member_count: totalMemberCount,
    total_user_groups: totalUserGroups,
  };
}

export async function statistics(ctx: MyContext) {
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

  await ctx.api.sendMessage(ctx.chat.id, text, { reply_markup: get_file_kb });
}
