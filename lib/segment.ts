import { prisma } from "@/lib/prisma";

export interface SegmentConditions {
  tagsInclude?: string[];
  tagsExclude?: string[];
  leadScore?: string[];
  regions?: string[];
  customerType?: string[];
}

export async function calculateSegmentUsers(
  conditions: SegmentConditions
): Promise<{ userIds: string[]; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isBlocked: false };

  // tagsInclude: user must have ALL of these tags (AND logic)
  if (conditions.tagsInclude && conditions.tagsInclude.length > 0) {
    where.tags = { hasEvery: conditions.tagsInclude };
  }

  // tagsExclude: user must NOT have any of these tags
  if (conditions.tagsExclude && conditions.tagsExclude.length > 0) {
    where.NOT = conditions.tagsExclude.map((tag) => ({
      tags: { has: tag },
    }));
  }

  // leadScore: user's leadScore must be in this array
  if (conditions.leadScore && conditions.leadScore.length > 0) {
    where.leadScore = { in: conditions.leadScore };
  }

  // regions: user must have at least one Region:xxx tag matching these slugs
  if (conditions.regions && conditions.regions.length > 0) {
    where.tags = {
      ...where.tags,
      hasSome: conditions.regions.map((slug) => `Region:${slug}`),
    };
  }

  // customerType: user's customerType must be in this array
  if (conditions.customerType && conditions.customerType.length > 0) {
    where.customerType = { in: conditions.customerType };
  }

  const users = await prisma.userProfile.findMany({
    where,
    select: { userId: true },
  });

  return {
    userIds: users.map((u) => u.userId),
    count: users.length,
  };
}
