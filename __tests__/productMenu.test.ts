import { describe, it, expect } from "vitest";
import {
  buildProductMenu,
  buildProductReply,
  PRODUCT_CATEGORIES,
} from "@/lib/flex/productMenu";

describe("PRODUCT_CATEGORIES", () => {
  it("has 9 categories", () => {
    expect(PRODUCT_CATEGORIES).toHaveLength(9);
  });

  it("each category has required fields", () => {
    for (const cat of PRODUCT_CATEGORIES) {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("intent");
      expect(cat).toHaveProperty("url");
      expect(cat).toHaveProperty("emoji");
      expect(cat).toHaveProperty("subs");
    }
  });
});

describe("buildProductMenu", () => {
  it("returns a Flex Message with type flex", () => {
    const msg = buildProductMenu();
    expect(msg.type).toBe("flex");
  });

  it("has altText", () => {
    const msg = buildProductMenu();
    expect(msg.altText).toBeTruthy();
  });

  it("contains a bubble with body", () => {
    const msg = buildProductMenu();
    expect(msg.contents.type).toBe("bubble");
    expect(msg.contents.body).toBeTruthy();
  });

  it("has 9 postback buttons matching categories", () => {
    const msg = buildProductMenu();
    const body = msg.contents.body;
    const buttons = findPostbackButtons(body);
    expect(buttons.length).toBe(9);
  });

  it("each button has correct postback data format", () => {
    const msg = buildProductMenu();
    const buttons = findPostbackButtons(msg.contents.body);
    for (const btn of buttons) {
      expect(btn.action.type).toBe("postback");
      expect(btn.action.data).toMatch(/^action=PRODUCT_VIEW&category=\w+$/);
    }
  });
});

describe("buildProductReply", () => {
  it("returns a Flex Message for valid category", () => {
    const msg = buildProductReply("toilet");
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe("flex");
  });

  it("contains URI buttons linking to lcb.com.tw for category with subs", () => {
    const msg = buildProductReply("toilet");
    const uriButtons = findUriButtons(msg!.contents);
    expect(uriButtons.length).toBeGreaterThan(0);
    for (const btn of uriButtons) {
      expect(btn.action.uri).toContain("lcb.com.tw");
    }
  });

  it("shows subcategory buttons for toilet (5 subs + 1 view all)", () => {
    const msg = buildProductReply("toilet");
    const uriButtons = findUriButtons(msg!.contents);
    // 5 subcategories + 1 "查看全部" button = 6
    expect(uriButtons.length).toBe(6);
  });

  it("shows direct link for accessibility (no subs)", () => {
    const msg = buildProductReply("accessibility");
    const uriButtons = findUriButtons(msg!.contents);
    expect(uriButtons.length).toBe(1);
    expect(uriButtons[0].action.uri).toContain("Epro");
  });

  it("returns null for invalid category", () => {
    const msg = buildProductReply("invalid_category");
    expect(msg).toBeNull();
  });
});

// Helper: recursively find postback buttons in a Flex structure
function findPostbackButtons(node: any): any[] {
  const results: any[] = [];
  if (!node) return results;
  if (node.type === "button" && node.action?.type === "postback") {
    results.push(node);
  }
  if (node.contents) {
    const children = Array.isArray(node.contents)
      ? node.contents
      : [node.contents];
    for (const child of children) {
      results.push(...findPostbackButtons(child));
    }
  }
  return results;
}

// Helper: recursively find URI buttons
function findUriButtons(node: any): any[] {
  const results: any[] = [];
  if (!node) return results;
  if (node.type === "button" && node.action?.type === "uri") {
    results.push(node);
  }
  if (node.contents) {
    const children = Array.isArray(node.contents)
      ? node.contents
      : [node.contents];
    for (const child of children) {
      results.push(...findUriButtons(child));
    }
  }
  if (node.body) results.push(...findUriButtons(node.body));
  if (node.footer) results.push(...findUriButtons(node.footer));
  return results;
}
