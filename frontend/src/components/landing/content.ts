import type { ComponentType } from "react";
import {
  BentoIcon,
  ChipIcon,
  DatabaseIcon,
  IconLibraryIcon,
  RocketIcon,
  SearchIcon,
  SparkIcon,
  SyncIcon,
} from "./icons";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export type LandingItem = {
  title: string;
  description: string;
  Icon: IconComponent;
};

export const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#categories", label: "Categories" },
] as const;

export const saveSteps = [
  "Paste the website URL",
  "Rein finds its icon and suggests a name",
  "Pick a category, add a note, save",
] as const;

export const features: LandingItem[] = [
  {
    title: "Bento categories",
    description: "Each category is a card holding its tools, laid out in a staggered grid.",
    Icon: BentoIcon,
  },
  {
    title: "Find by purpose",
    description: "Search names, descriptions, domains and categories at once.",
    Icon: SearchIcon,
  },
  {
    title: "Automatic icons",
    description: "Paste a link and Rein looks up the site's icon for you, with a clean fallback.",
    Icon: SparkIcon,
  },
  {
    title: "Synced everywhere",
    description: "Sign in on any browser or device and the same library is there.",
    Icon: SyncIcon,
  },
];

export const categories: LandingItem[] = [
  { title: "Icon Libraries", description: "Icon sets and glyph collections.", Icon: IconLibraryIcon },
  { title: "Deployment", description: "Hosting, CI and deploy platforms.", Icon: RocketIcon },
  { title: "Databases", description: "Data stores, ORMs and admin tools.", Icon: DatabaseIcon },
  { title: "AI Agents", description: "Assistants, agents and model playgrounds.", Icon: ChipIcon },
];
