import { panel } from "@/components/ui/styles";
import type { LandingItem } from "./content";

export function FeatureCard({ title, description, Icon }: LandingItem) {
  return (
    <li className={`${panel} flex gap-4 p-6`}>
      <Icon size={40} className="shrink-0 text-rein-accent" />
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-[17px] font-semibold">{title}</h3>
        <p className="m-0 text-[15px] leading-normal text-rein-soft">{description}</p>
      </div>
    </li>
  );
}

export function CategoryCard({ title, description, Icon }: LandingItem) {
  return (
    <li className={`${panel} flex flex-col`}>
      <div className="blueprint-grid-fine flex h-40 items-center justify-center border-b border-dashed border-rein-border">
        <Icon size={72} strokeWidth={1} className="text-rein-accent" />
      </div>
      <div className="flex flex-col gap-1.5 p-5">
        <h3 className="m-0 text-[17px] font-semibold">{title}</h3>
        <p className="m-0 text-[15px] leading-normal text-rein-soft">{description}</p>
      </div>
    </li>
  );
}
