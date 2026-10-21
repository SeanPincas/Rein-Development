"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowPathIcon, ArrowsUpDownIcon, CheckIcon, FolderPlusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { AppShell } from "@/components/layout/app-shell";
import { Navbar } from "@/components/navigation/navbar";
import { buttonStyles, eyebrow, panel } from "@/components/ui/styles";
import { cx } from "@/lib/design";
import { ReorderQueue, applyOrder, keyboardTargetIndex, moveById, moveItem, sendCategoryOrder } from "@/lib/shared/category-order";
import type { LibraryCategory, LibrarySnapshot, LibraryTool } from "@/lib/shared/library-types";
import { AddToolDialog } from "./add-tool-dialog";
import { CreateCategoryDialog } from "./create-category-dialog";
import { CategoryCard, CategoryCardSkeleton } from "./library-cards";
import { ReorderableCard, type DragState } from "./reorderable-card";
import { LibrarySearch } from "./library-search";
import { StaggeredGrid } from "./staggered-grid";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; snapshot: LibrarySnapshot }
  | { status: "error"; message: string };

const REFRESH_THROTTLE_MS = 15_000;

type FetchResult =
  | { kind: "ok"; snapshot: LibrarySnapshot }
  | { kind: "redirect"; to: string }
  | { kind: "error"; message: string };

async function fetchLibrary(): Promise<FetchResult> {
  try {
    const response = await fetch("/api/library", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (response.status === 401) return { kind: "redirect", to: "/sign-in" };
    if (body?.error?.code === "EMAIL_UNVERIFIED") return { kind: "redirect", to: "/verify-email" };
    if (!response.ok) return { kind: "error", message: body?.error?.message ?? "Your library could not be loaded." };
    return { kind: "ok", snapshot: { categories: body.data.categories, meta: body.meta } };
  } catch {
    return { kind: "error", message: "You appear to be offline. Check your connection and try again." };
  }
}

async function toggleFavorite(tool: LibraryTool): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`/api/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !tool.isFavorite, version: tool.version }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok) return { ok: true };
    return { ok: false, message: body?.error?.message ?? "Favorite status could not be updated." };
  } catch {
    return { ok: false, message: "You appear to be offline. Try again." };
  }
}

const normalize = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, " ").trim();

function matches(tool: LibraryTool, query: string) {
  return [tool.name, tool.description, tool.hostname].some((field) => normalize(field).includes(query));
}

/** Categories and tools visible for the current search. */
function visibleCategories(categories: LibraryCategory[], query: string) {
  const q = normalize(query);
  return categories
    .map((category) => {
      if (!q) return { category, tools: category.tools };
      // A category-name match keeps all of its tools.
      if (normalize(category.name).includes(q)) return { category, tools: category.tools };
      return { category, tools: category.tools.filter((tool) => matches(tool, q)) };
    })
    .filter(({ tools }) => !q || tools.length > 0);
}

/**
 * Content fingerprint used to decide when to replay the card entrance. It ignores
 * category order and category versions so a drag-and-drop reorder (which bumps
 * versions server-side) doesn't replay the animation on the next refresh.
 */
const librarySignature = (snapshot: LibrarySnapshot) =>
  [...snapshot.categories]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((category) => `${category.id}:${category.name}:${category.iconKey}:${category.tools.map((tool) => `${tool.id}:${tool.version}`).join(",")}`)
    .join("|");

const withCategories = (snapshot: LibrarySnapshot, categories: LibraryCategory[]): LibrarySnapshot => ({ ...snapshot, categories });

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

function AddToolButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(buttonStyles.navPrimary, "gap-1.5 disabled:cursor-not-allowed disabled:opacity-60")}
    >
      <PlusIcon aria-hidden="true" className="size-4 stroke-2" />
      <span>Add Tool</span>
    </button>
  );
}

export function LibraryView() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [entranceKey, setEntranceKey] = useState(0);
  const [addTool, setAddTool] = useState<{ open: boolean; categoryId?: string }>({ open: false });
  const openAddTool = (categoryId?: string) => setAddTool({ open: true, categoryId });
  const lastSignature = useRef<string | null>(null);
  const lastLoad = useRef(0);
  const [drag, setDrag] = useState<DragState>({ draggingId: null, overId: null });
  // Rearranging is an explicit mode: handles and dragging only appear while it is on.
  const [rearranging, setRearranging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const focusAfterMove = useRef<string | null>(null);
  const orderRef = useRef<string[]>([]);
  const queueRef = useRef<ReorderQueue | null>(null);

  const apply = useCallback(
    (result: FetchResult, mode: "initial" | "refresh") => {
      setRefreshing(false);
      if (result.kind === "redirect") return router.replace(result.to);
      if (result.kind === "ok") {
        // Replay the card entrance on first load and whenever the library actually changed.
        const signature = librarySignature(result.snapshot);
        if (signature !== lastSignature.current) {
          lastSignature.current = signature;
          setEntranceKey((key) => key + 1);
        }
        const queue = queueRef.current;
        const serverIds = result.snapshot.categories.map((category) => category.id);
        if (queue?.busy) {
          // A reorder is still being saved: keep the order the user sees, take everything else.
          const snapshot = withCategories(result.snapshot, applyOrder(result.snapshot.categories, orderRef.current));
          return setState({ status: "ready", snapshot });
        }
        queue?.sync(serverIds);
        orderRef.current = serverIds;
        return setState({ status: "ready", snapshot: result.snapshot });
      }
      // Keep showing the last good library when a background refresh fails.
      if (mode === "initial") setState({ status: "error", message: result.message });
    },
    [router],
  );

  const reload = useCallback(
    (mode: "initial" | "refresh") => {
      lastLoad.current = Date.now();
      if (mode === "refresh") setRefreshing(true);
      else setState({ status: "loading" });
      void fetchLibrary().then((result) => apply(result, mode));
    },
    [apply],
  );

  // One queue for the page: serialises PATCH /api/categories/order and reverts on failure.
  const getQueue = useCallback(() => {
    queueRef.current ??= new ReorderQueue(orderRef.current, {
      send: (ids) => sendCategoryOrder(ids),
      onRevert: (confirmedIds, error) => {
        orderRef.current = confirmedIds;
        setState((current) =>
          current.status === "ready"
            ? { status: "ready", snapshot: withCategories(current.snapshot, applyOrder(current.snapshot.categories, confirmedIds)) }
            : current,
        );
        setAnnouncement("The new order could not be saved, so the previous order was restored.");
        toast.error(error instanceof Error ? error.message : "The new order could not be saved.");
      },
    });
    return queueRef.current;
  }, []);

  /** Optimistically show `next`, then persist the full sequence. */
  const commitOrder = useCallback(
    (next: LibraryCategory[]) => {
      const ids = next.map((category) => category.id);
      orderRef.current = ids;
      setState((current) =>
        current.status === "ready" ? { status: "ready", snapshot: withCategories(current.snapshot, applyOrder(next, ids)) } : current,
      );
      const queue = getQueue();
      void queue.submit(ids).then(() => {
        // Once everything is saved, pull fresh versions quietly (reorder bumps category versions).
        if (!queue.busy && queue.confirmedIds.join() === ids.join()) reload("refresh");
      });
    },
    [getQueue, reload],
  );

  const handleDrop = useCallback(
    (draggedId: string, targetId: string) => {
      if (state.status !== "ready") return;
      const next = moveById(state.snapshot.categories, draggedId, targetId);
      if (!next) return;
      const moved = next.find((category) => category.id === draggedId);
      commitOrder(next);
      if (moved) setAnnouncement(`${moved.name} moved to position ${next.indexOf(moved) + 1} of ${next.length}.`);
    },
    [state, commitOrder],
  );

  const handleKeyboardMove = useCallback(
    (id: string, key: string) => {
      if (state.status !== "ready") return false;
      const list = state.snapshot.categories;
      const from = list.findIndex((category) => category.id === id);
      const to = keyboardTargetIndex(from, key, list.length);
      if (from === -1 || to === null) return false;
      const next = moveItem(list, from, to);
      focusAfterMove.current = id;
      commitOrder(next);
      setAnnouncement(`${list[from].name} moved to position ${to + 1} of ${list.length}.`);
      return true;
    },
    [state, commitOrder],
  );

  useEffect(() => {
    if (!rearranging) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        setRearranging(false);
        setAnnouncement("Rearranging off.");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rearranging]);

  // Cards remount when they change columns; keep keyboard focus on the moved card's handle.
  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    document.querySelector<HTMLElement>(`[data-reorder-handle="${id}"]`)?.focus();
  });

  const handleToggleFavorite = useCallback(async (tool: LibraryTool) => {
    const result = await toggleFavorite(tool);
    if (!result.ok) return;
    reload("refresh");
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    lastLoad.current = Date.now();
    void fetchLibrary().then((result) => {
      if (!cancelled) apply(result, "initial");
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Fresh data when returning to the tab or window (cloud sync without push updates).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current > REFRESH_THROTTLE_MS) {
        reload("refresh");
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);

  const categories = useMemo(() => (state.status === "ready" ? state.snapshot.categories : []), [state]);
  const visible = useMemo(() => visibleCategories(categories, query), [categories, query]);
  const searching = normalize(query).length > 0;
  const matchCount = visible.reduce((sum, item) => sum + item.tools.length, 0);
  // Reordering a filtered subset would be ambiguous, so the mode is unavailable while searching.
  const rearrangeAvailable = state.status === "ready" && !searching && categories.length > 1;
  const reorderEnabled = rearranging && rearrangeAvailable;

  const summary =
    state.status !== "ready"
      ? " "
      : searching
        ? `${plural(matchCount, "tool")} shown`
        : `${plural(state.snapshot.meta.categoryCount, "category", "categories")} · ${plural(state.snapshot.meta.toolCount, "tool")}`;

  return (
    <AppShell
      backdrop="subtle"
      nav={
        <Navbar actions={<AddToolButton onClick={() => openAddTool()} disabled={state.status !== "ready"} />}>
          <LibrarySearch value={query} onChange={setQuery} />
        </Navbar>
      }
    >
      <main className="mx-auto flex max-w-[1200px] flex-col gap-5 px-6 pb-16 pt-12">
        <section aria-labelledby="library-title" className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-1.5">
            <p className={cx("m-0", eyebrow)}>LIBRARY / SHEET 01</p>
            <h1 id="library-title" className="m-0 text-[40px] font-bold leading-none tracking-[-0.035em]">
              Your toolkit
            </h1>
            {/* Counts and Create Category share one row, centred on each other. */}
            <div className="-mt-0.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-rein-soft">
                <span aria-live="polite">{summary.toUpperCase()}</span>
                {refreshing && (
                  <span className="flex items-center gap-1.5 text-rein-label">
                    <ArrowPathIcon aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
                    REFRESHING
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {rearranging && (
                  <span className="hidden font-mono text-[11px] tracking-[0.08em] text-rein-label sm:inline">
                    DRAG CARDS OR USE ARROW KEYS ON A HANDLE
                  </span>
                )}
                <button
                  type="button"
                  aria-pressed={rearranging}
                  aria-label={rearranging ? "Done rearranging categories" : "Rearrange categories"}
                  title={rearranging ? "Done rearranging (Esc)" : "Rearrange categories"}
                  disabled={!rearrangeAvailable}
                  onClick={() => {
                    setRearranging((on) => !on);
                    setAnnouncement(rearranging ? "Rearranging off." : "Rearranging on. Drag cards, or focus a handle and use the arrow keys.");
                  }}
                  className={cx(
                    "flex size-11 shrink-0 items-center justify-center rounded-[10px] border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    rearranging
                      ? "border-rein-accent bg-rein-accent text-black hover:bg-violet-300"
                      : "border-white/30 text-white hover:border-white",
                  )}
                >
                  {rearranging ? (
                    <CheckIcon aria-hidden="true" className="size-5 stroke-2" />
                  ) : (
                    <ArrowsUpDownIcon aria-hidden="true" className="size-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingCategory(true)}
                  className={cx(buttonStyles.outline, "px-4")}
                >
                  <FolderPlusIcon aria-hidden="true" className="size-[18px]" />
                  Create Category
                </button>
              </div>
            </div>
          </div>
        </section>

        {state.status === "loading" && (
          <div aria-busy="true" aria-label="Loading your library">
            <StaggeredGrid items={[3, 2, 4, 2, 3, 1].map((rows, i) => <CategoryCardSkeleton key={i} rows={rows} />)} />
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className={cx(panel, "flex flex-col items-start gap-4 p-8")}>
            <h2 className="m-0 text-xl font-semibold">Your library didn’t load</h2>
            <p className="m-0 text-rein-soft">{state.message}</p>
            <button
              type="button"
              onClick={() => reload("initial")}
              className={buttonStyles.primary}
            >
              Try again
            </button>
          </div>
        )}

        {state.status === "ready" && categories.length === 0 && (
          <div className={cx(panel, "flex flex-col items-center gap-4 px-8 py-16 text-center")}>
            <p className={cx("m-0", eyebrow)}>EMPTY SHEET</p>
            <h2 className="m-0 text-2xl font-bold tracking-[-0.02em]">Your library is empty</h2>
            <p className="m-0 max-w-md text-rein-soft">
              Save your first tool and give it a category. It will show up here as a card, on every browser you sign in to.
            </p>
            <AddToolButton onClick={() => openAddTool()} />
          </div>
        )}

        {state.status === "ready" && categories.length > 0 && visible.length === 0 && (
          <div className={cx(panel, "flex flex-col items-center gap-4 px-8 py-14 text-center")}>
            <h2 className="m-0 text-xl font-semibold">
              No tools match “{query.trim()}”
            </h2>
            <button
              type="button"
              onClick={() => setQuery("")}
              className={buttonStyles.outline}
            >
              Clear search
            </button>
          </div>
        )}

        {state.status === "ready" && visible.length > 0 && (
          <StaggeredGrid
            animationKey={entranceKey}
            items={visible.map(({ category, tools }, index) => (
              <ReorderableCard
                key={category.id}
                id={category.id}
                name={category.name}
                index={index}
                count={categories.length}
                enabled={reorderEnabled}
                drag={drag}
                onDragStateChange={setDrag}
                onDropOn={handleDrop}
                onKeyboardMove={handleKeyboardMove}
              >
                {(handle) => (
                  <CategoryCard
                    category={category}
                    tools={tools}
                    onAddTool={() => openAddTool(category.id)}
                    onToggleFavorite={handleToggleFavorite}
                    headerAccessory={handle}
                  />
                )}
              </ReorderableCard>
            ))}
          />
        )}
        <p id="category-reorder-help" className="sr-only">
          Drag a card to reorder it, or focus its handle and use the arrow keys. Home and End move it to the first or last position.
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </main>
      <AddToolDialog
        open={addTool.open}
        onOpenChange={(open) => setAddTool((current) => ({ ...current, open }))}
        categories={categories}
        initialCategoryId={addTool.categoryId}
        onSaved={() => reload("refresh")}
      />
      <CreateCategoryDialog
        open={creatingCategory}
        onOpenChange={setCreatingCategory}
        onCreated={() => reload("refresh")}
      />
    </AppShell>
  );
}
