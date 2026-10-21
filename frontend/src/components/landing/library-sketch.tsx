type SketchCard = {
  label: string;
  rows: string[];
  highlighted?: boolean;
};

const columns: { offset: boolean; cards: SketchCard[] }[] = [
  {
    offset: false,
    cards: [
      { label: "Icon libraries", rows: ["80%", "60%", "70%"] },
      { label: "Databases", rows: ["70%", "50%"] },
    ],
  },
  {
    offset: true,
    cards: [
      { label: "Motion", rows: ["85%", "65%", "75%", "55%"], highlighted: true },
      { label: "UI reference", rows: ["75%", "55%"] },
    ],
  },
  {
    offset: false,
    cards: [
      { label: "Deployment", rows: ["70%", "80%", "50%"] },
      { label: "AI agents", rows: ["65%"] },
    ],
  },
];

/** Decorative blueprint drawing of the staggered three-column library. */
export function LibrarySketch() {
  return (
    <figure
      aria-label="Sketch of a Rein library: category cards in three staggered columns"
      className="relative m-0 border border-rein-border bg-rein-surface p-5 sm:p-7"
    >
      <div className="mb-5 flex justify-between font-mono text-[11px] tracking-[0.12em] text-rein-label">
        <span>LIBRARY / LAYOUT</span>
        <span>3 COL · STAGGER 32</span>
      </div>
      <div className="grid grid-cols-3 items-start gap-2.5 sm:gap-3.5" aria-hidden="true">
        {columns.map((column, index) => (
          <div
            key={index}
            className={`flex flex-col gap-2.5 sm:gap-3.5 ${column.offset ? "mt-8" : ""}`}
          >
            {column.cards.map((card) => (
              <div
                key={card.label}
                className={`flex flex-col gap-2.5 p-2.5 sm:p-3.5 ${
                  card.highlighted
                    ? "border border-rein-accent bg-rein-accent-deep/15"
                    : "border border-dashed border-rein-border-strong"
                }`}
              >
                <div
                  className={`truncate font-mono text-[10px] uppercase sm:text-[11px] ${
                    card.highlighted ? "text-white" : "text-violet-300"
                  }`}
                >
                  {card.label}
                </div>
                {card.rows.map((width, rowIndex) => (
                  <div
                    key={rowIndex}
                    className={`h-1.5 ${
                      card.highlighted
                        ? rowIndex === 0
                          ? "bg-white/50"
                          : "bg-white/30"
                        : rowIndex === 0
                          ? "bg-rein-accent/35"
                          : "bg-rein-accent/20"
                    }`}
                    style={{ width }}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <figcaption className="absolute bottom-2.5 right-3 font-mono text-[11px] text-rein-label">
        A.01
      </figcaption>
    </figure>
  );
}
