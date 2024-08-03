import { unstable_cache } from "next/cache";

import { db } from "../db";

export const getUserGroupIdsAndRole = unstable_cache(
  async (userId: string) => {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
        role: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      groupIds: user.groupMemberships.map((membership) => membership.groupId),
      role: user.role,
    };
  },
  ["user-group-ids-and-role"], // nextjs automatically adds the user id to the cache key
  {
    tags: ["user-group-ids-and-role"], // cache tag
    revalidate: 5 * 60, // 5 minutes
  },
);
