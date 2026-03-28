import { prisma } from "@/lib/prisma";
import { SegmentClient } from "@/components/segments/SegmentClient";

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const segments = await prisma.segment.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <SegmentClient
      initialSegments={segments.map((s) => ({
        ...s,
        conditions: s.conditions as {
          tagsInclude?: string[];
          tagsExclude?: string[];
          leadScore?: string[];
          regions?: string[];
          customerType?: string[];
        },
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
    />
  );
}
