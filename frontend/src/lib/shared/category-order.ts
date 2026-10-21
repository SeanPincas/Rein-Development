/**
 * Category reordering: pure helpers plus a request queue.
 *
 * There is one logical category sequence. The staggered grid deals it into
 * 3 / 2 / 1 columns by screen width, so a move is always "change this card's
 * index in the sequence" — never a per-layout order.
 */

export type OrderItem = { id: string; sortOrder: number };

/** Move the item at `from` to `to` (both indexes in the original array). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Drop `draggedId` onto `targetId`: the dragged card takes the target's position. */
export function moveById<T extends { id: string }>(list: readonly T[], draggedId: string, targetId: string): T[] | null {
  const from = list.findIndex((item) => item.id === draggedId);
  const to = list.findIndex((item) => item.id === targetId);
  if (from === -1 || to === -1 || from === to) return null;
  return moveItem(list, from, to);
}

/** Keyboard move target: ←/↑ earlier, →/↓ later, Home first, End last. Null for other keys or no-ops. */
export function keyboardTargetIndex(index: number, key: string, length: number): number | null {
  const target =
    key === "ArrowUp" || key === "ArrowLeft"
      ? index - 1
      : key === "ArrowDown" || key === "ArrowRight"
        ? index + 1
        : key === "Home"
          ? 0
          : key === "End"
            ? length - 1
            : null;
  if (target === null || target < 0 || target >= length || target === index) return null;
  return target;
}

/** Complete PATCH /api/categories/order body: every category once, sortOrder from 1. */
export function toOrderPayload(ids: readonly string[]): { items: OrderItem[] } {
  return { items: ids.map((id, index) => ({ id, sortOrder: index + 1 })) };
}

/** Arrange `list` to follow `ids`, rewriting sortOrder. Items missing from `ids` keep their relative order at the end. */
export function applyOrder<T extends { id: string; sortOrder: number }>(list: readonly T[], ids: readonly string[]): T[] {
  const rank = new Map(ids.map((id, index) => [id, index]));
  return [...list]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (rank.get(a.item.id) ?? ids.length + a.index) - (rank.get(b.item.id) ?? ids.length + b.index))
    .map(({ item }, index) => ({ ...item, sortOrder: index + 1 }));
}

export class ReorderRequestError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ReorderRequestError";
    this.code = code;
  }
}

/** Send the full order. Resolves on 2xx, throws ReorderRequestError otherwise. */
export async function sendCategoryOrder(ids: readonly string[], fetchImpl: typeof fetch = fetch): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl("/api/categories/order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toOrderPayload(ids)),
    });
  } catch {
    throw new ReorderRequestError("You appear to be offline. The order was not saved.");
  }
  if (response.ok) return;
  const body = await response.json().catch(() => null);
  throw new ReorderRequestError(body?.error?.message ?? "The new order could not be saved.", body?.error?.code);
}

type QueueOptions = {
  send: (ids: string[]) => Promise<void>;
  /** Called when a request fails: put the UI back to the last order the server accepted. */
  onRevert: (confirmedIds: string[], error: unknown) => void;
};

/**
 * Serialises reorder requests so an older order can never land after a newer one.
 * Only one request is in flight; moves made meanwhile collapse into a single
 * follow-up carrying the latest order. A failure reverts to the last confirmed
 * order and drops anything queued behind it.
 */
export class ReorderQueue {
  private confirmed: string[];
  private pending: string[] | null = null;
  private running: Promise<void> | null = null;
  private readonly options: QueueOptions;

  constructor(initialIds: readonly string[], options: QueueOptions) {
    this.confirmed = [...initialIds];
    this.options = options;
  }

  /** True while a request is in flight or queued. */
  get busy(): boolean {
    return this.running !== null || this.pending !== null;
  }

  get confirmedIds(): string[] {
    return [...this.confirmed];
  }

  /** Adopt the server's order from a fresh library snapshot (ignored while busy). */
  sync(ids: readonly string[]): void {
    if (!this.busy) this.confirmed = [...ids];
  }

  submit(ids: readonly string[]): Promise<void> {
    this.pending = [...ids];
    if (!this.running) this.running = this.drain();
    return this.running;
  }

  private async drain(): Promise<void> {
    try {
      while (this.pending) {
        const ids = this.pending;
        this.pending = null;
        try {
          await this.options.send(ids);
          this.confirmed = ids;
        } catch (error) {
          this.pending = null;
          this.options.onRevert([...this.confirmed], error);
          return;
        }
      }
    } finally {
      this.running = null;
    }
  }
}
