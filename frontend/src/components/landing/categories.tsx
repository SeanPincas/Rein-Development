import { sectionTitle } from "@/components/ui/styles";
import { CategoryCarousel } from "./category-carousel";

export function Categories() {
  return (
    <section id="categories" aria-labelledby="categories-title" className="flex scroll-mt-10 flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="categories-title" className={sectionTitle}>
          Built for your <span className="text-rein-accent">whole toolkit</span>
        </h2>
        <p className="m-0 max-w-[360px] text-base leading-normal text-rein-soft">
          Make your own categories for organization, each with its own icon.
        </p>
      </div>
      <CategoryCarousel />
    </section>
  );
}
