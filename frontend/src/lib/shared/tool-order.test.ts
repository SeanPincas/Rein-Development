import { describe, expect, it } from "vitest";

import { sortTools } from "./tool-order";

const tool = (id: string, name: string, isFavorite = false, hostname = `${id}.example`) => ({ id, name, hostname, isFavorite });
const names = (list: { name: string }[]) => list.map((t) => t.name);

describe("tool display order", () => {
  it("sorts tools alphabetically, ignoring case and accents", () => {
    expect(names(sortTools([tool("1", "vercel"), tool("2", "Astro"), tool("3", "Écrire"), tool("4", "figma")]))).toEqual([
      "Astro",
      "Écrire",
      "figma",
      "vercel",
    ]);
  });

  it("puts favorites first, each group in its own alphabetical order", () => {
    const sorted = sortTools([
      tool("1", "Zed", true),
      tool("2", "Bun"),
      tool("3", "Linear", true),
      tool("4", "Astro"),
      tool("5", "Clerk", true),
    ]);
    expect(names(sorted)).toEqual(["Clerk", "Linear", "Zed", "Astro", "Bun"]);
  });

  it("orders numbers naturally and breaks ties stably", () => {
    expect(names(sortTools([tool("1", "Tool 10"), tool("2", "Tool 2")]))).toEqual(["Tool 2", "Tool 10"]);
    const ties = sortTools([tool("b", "Docs", false, "b.dev"), tool("a", "Docs", false, "a.dev")]);
    expect(ties.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const input = [tool("1", "B"), tool("2", "A")];
    sortTools(input);
    expect(names(input)).toEqual(["B", "A"]);
  });
});
