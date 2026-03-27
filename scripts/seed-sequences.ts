/**
 * Seed hardcoded sequences into the DB.
 * Run: npx tsx scripts/seed-sequences.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEQUENCES = [
  {
    name: "新客教育序列",
    trigger: "new_customer",
    steps: [
      { dayOffset: 0, messageType: "flex", order: 0, content: { label: "歡迎訊息", template: "welcome" } },
      { dayOffset: 3, messageType: "flex", order: 1, content: { label: "品類教育", template: "category_education" } },
      { dayOffset: 7, messageType: "flex", order: 2, content: { label: "產品推薦（個人化）", template: "day7_personalized" } },
      { dayOffset: 30, messageType: "flex", order: 3, content: { label: "追蹤訊息", template: "follow_up" } },
    ],
  },
  {
    name: "維修服務序列",
    trigger: "repair_inquiry",
    steps: [
      { dayOffset: 0, messageType: "flex", order: 0, content: { label: "維修服務即時回覆", template: "repair_immediate" } },
      { dayOffset: 3, messageType: "flex", order: 1, content: { label: "升級推薦", template: "repair_upgrade" } },
    ],
  },
];

async function main() {
  for (const seq of SEQUENCES) {
    const existing = await prisma.sequence.findFirst({
      where: { trigger: seq.trigger },
    });

    if (existing) {
      console.log(`Sequence "${seq.name}" already exists (trigger=${seq.trigger}), skipping`);
      continue;
    }

    const created = await prisma.sequence.create({
      data: {
        name: seq.name,
        trigger: seq.trigger,
        isActive: true,
        steps: {
          create: seq.steps,
        },
      },
      include: { steps: true },
    });

    console.log(`Created sequence "${created.name}" with ${created.steps.length} steps`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
