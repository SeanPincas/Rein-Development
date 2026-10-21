import { eyebrow, panel, sectionTitle } from "@/components/ui/styles";
import { features, saveSteps } from "./content";
import { FeatureCard } from "./feature-card";

export function About() {
  return (
    <section
      id="features"
      aria-labelledby="about-title"
      className="flex scroll-mt-10 flex-wrap gap-12 border-t border-rein-line pt-16"
    >
      <div id="how-it-works" className="flex min-w-0 flex-[1_1_340px] scroll-mt-10 flex-col gap-6">
        <h2 id="about-title" className={sectionTitle}>
          What is <span className="text-rein-accent">Rein</span>?
        </h2>
        <p className="m-0 text-[17px] leading-relaxed text-rein-muted">
          Rein is a private library for the websites you rely on as a developer. Instead of digging
          through bookmarks in different browsers, you save each tool once, file it under a category,
          and find it again in seconds.
        </p>
        <div className={`${panel} flex flex-col gap-4 p-5`}>
          <h3 className={`m-0 font-normal ${eyebrow}`}>SAVING A TOOL</h3>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {saveSteps.map((step, index) => (
              <li key={step} className="flex items-baseline gap-3.5 text-base">
                <span className="font-mono text-[13px] text-rein-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
        <h3 className="m-0 text-[22px] font-semibold">Key features</h3>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-0">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </ul>
      </div>
    </section>
  );
}
