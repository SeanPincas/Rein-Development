import { describe, expect, it } from "vitest";
import { columnEntrance } from "./entrance";

describe("columnEntrance", () => {
  it("alternates direction by column and leads with the card nearest its destination", () => {
    expect(columnEntrance(0, 0, 3).className).toBe("rein-enter-down");
    expect(columnEntrance(1, 0, 3).className).toBe("rein-enter-up");
    expect(columnEntrance(2, 0, 3).className).toBe("rein-enter-down");

    const opts = { stepMs: 100, columnOffsetMs: 0 };
    // Falling column: bottom card first.
    expect(columnEntrance(0, 2, 3, opts).style.animationDelay).toBe("0ms");
    expect(columnEntrance(0, 0, 3, opts).style.animationDelay).toBe("200ms");
    // Rising column: top card first.
    expect(columnEntrance(1, 0, 3, opts).style.animationDelay).toBe("0ms");
    expect(columnEntrance(1, 2, 3, opts).style.animationDelay).toBe("200ms");
  });
});
