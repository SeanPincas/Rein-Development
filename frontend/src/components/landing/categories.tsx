import { sectionTitle } from "@/components/ui/styles";
import { categories } from "./content";
import { CategoryCard } from "./feature-card";

export function Categories() {
  return (
    <section id="categories" aria-labelledby="categories-title" className="flex scroll-mt-8 flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="categories-title" className={sectionTitle}>
          Built for your <span className="text-rein-accent">whole toolkit</span>
        </h2>
        <p className="m-0 max-w-[360px] text-base leading-normal text-rein-soft">
          Make your own categories, each with its own icon.
        </p>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-0">
        {categories.map((category) => (
          <CategoryCard key={category.title} {...category} />
        ))}
      </ul>
    </section>
  );
}
