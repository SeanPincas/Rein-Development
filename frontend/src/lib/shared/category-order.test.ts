import { describe, expect, it, vi } from "vitest";

import {
  ReorderQueue,
  applyOrder,
  keyboardTargetIndex,
  moveById,
  moveItem,
  sendCategoryOrder,
  toOrderPayload,
} from "./category-order";

const ids = ["a", "b", "c", "d", "e"];
const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("reordered arrays", () => {
  it("moves an item later and earlier", () => {
    expect(moveItem(ids, 0, 2)).toEqual(["b", "c", "a", "d", "e"]);
    expect(moveItem(ids, 4, 1)).toEqual(["a", "e", "b", "c", "d"]);
  });

  it("leaves the array unchanged for no-op or out-of-range moves", () => {
    expect(moveItem(ids, 2, 2)).toEqual(ids);
    expect(moveItem(ids, -1, 2)).toEqual(ids);
    expect(moveItem(ids, 1, 9)).toEqual(ids);
  });

  it("drops a dragged card into the target card's position", () => {
    const list = ids.map((id) => ({ id }));
    expect(moveById(list, "a", "c")?.map((x) => x.id)).toEqual(["b", "c", "a", "d", "e"]);
    expect(moveById(list, "d", "b")?.map((x) => x.id)).toEqual(["a", "d", "b", "c", "e"]);
    expect(moveById(list, "a", "a")).toBeNull();
    expect(moveById(list, "a", "missing")).toBeNull();
  });

  it("applies an order and rewrites sortOrder from 1", () => {
    const list = ids.map((id, i) => ({ id, sortOrder: i + 1 }));
    expect(applyOrder(list, ["c", "a", "b", "d", "e"])).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "a", sortOrder: 2 },
      { id: "b", sortOrder: 3 },
      { id: "d", sortOrder: 4 },
      { id: "e", sortOrder: 5 },
    ]);
  });
});

describe("keyboard movement", () => {
  it("maps arrows, Home and End to target indexes", () => {
    expect(keyboardTargetIndex(2, "ArrowUp", 5)).toBe(1);
    expect(keyboardTargetIndex(2, "ArrowLeft", 5)).toBe(1);
    expect(keyboardTargetIndex(2, "ArrowDown", 5)).toBe(3);
    expect(keyboardTargetIndex(2, "ArrowRight", 5)).toBe(3);
    expect(keyboardTargetIndex(2, "Home", 5)).toBe(0);
    expect(keyboardTargetIndex(2, "End", 5)).toBe(4);
  });

  it("ignores moves past either end and unrelated keys", () => {
    expect(keyboardTargetIndex(0, "ArrowUp", 5)).toBeNull();
    expect(keyboardTargetIndex(4, "ArrowDown", 5)).toBeNull();
    expect(keyboardTargetIndex(0, "Home", 5)).toBeNull();
    expect(keyboardTargetIndex(2, "Enter", 5)).toBeNull();
  });

  it("produces the same sequence a mouse drop would", () => {
    const target = keyboardTargetIndex(0, "ArrowDown", ids.length)!;
    expect(moveItem(ids, 0, target)).toEqual(["b", "a", "c", "d", "e"]);
  });
});

describe("sending the complete ordered list", () => {
  it("builds one item per category with sortOrder starting at 1", () => {
    expect(toOrderPayload(["c", "a", "b"])).toEqual({
      items: [
        { id: "c", sortOrder: 1 },
        { id: "a", sortOrder: 2 },
        { id: "b", sortOrder: 3 },
      ],
    });
  });

  it("PATCHes every category to /api/categories/order", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { updatedCount: 5 } }), { status: 200 }));
    await sendCategoryOrder(ids, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/categories/order");
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body);
    expect(body.items).toHaveLength(ids.length);
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(ids);
    expect(body.items.map((item: { sortOrder: number }) => item.sortOrder)).toEqual([1, 2, 3, 4, 5]);
  });

  it("throws with the server's message on failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Order is incomplete." } }), { status: 422 }),
    );
    await expect(sendCategoryOrder(ids, fetchImpl)).rejects.toMatchObject({ code: "VALIDATION_ERROR", message: "Order is incomplete." });
  });
});

describe("ReorderQueue", () => {
  it("sends the latest order and confirms it", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const queue = new ReorderQueue(ids, { send, onRevert: vi.fn() });
    await queue.submit(["b", "a", "c", "d", "e"]);
    expect(send).toHaveBeenCalledWith(["b", "a", "c", "d", "e"]);
    expect(queue.confirmedIds).toEqual(["b", "a", "c", "d", "e"]);
    expect(queue.busy).toBe(false);
  });

  it("collapses rapid moves so no stale order is sent after a newer one", async () => {
    const first = deferred();
    const send = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    const queue = new ReorderQueue(ids, { send, onRevert: vi.fn() });

    const done = queue.submit(["b", "a", "c", "d", "e"]);
    queue.submit(["c", "b", "a", "d", "e"]);
    queue.submit(["d", "c", "b", "a", "e"]);
    expect(send).toHaveBeenCalledTimes(1);

    first.resolve();
    await done;
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith(["d", "c", "b", "a", "e"]);
    expect(queue.confirmedIds).toEqual(["d", "c", "b", "a", "e"]);
  });

  it("reverts to the last confirmed order after a failed request and drops queued moves", async () => {
    const first = deferred();
    const send = vi.fn().mockReturnValueOnce(first.promise);
    const onRevert = vi.fn();
    const queue = new ReorderQueue(ids, { send, onRevert });

    const done = queue.submit(["b", "a", "c", "d", "e"]);
    queue.submit(["c", "b", "a", "d", "e"]);
    first.reject(new Error("network"));
    await done;

    expect(onRevert).toHaveBeenCalledWith(ids, expect.any(Error));
    expect(send).toHaveBeenCalledTimes(1);
    expect(queue.busy).toBe(false);
    expect(queue.confirmedIds).toEqual(ids);
  });

  it("ignores server snapshots while a request is pending", async () => {
    const first = deferred();
    const queue = new ReorderQueue(ids, { send: vi.fn().mockReturnValueOnce(first.promise), onRevert: vi.fn() });
    const done = queue.submit(["e", "a", "b", "c", "d"]);
    queue.sync(["a", "b", "c", "d", "e"]);
    first.resolve();
    await done;
    expect(queue.confirmedIds).toEqual(["e", "a", "b", "c", "d"]);
  });
});
