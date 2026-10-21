import type { ComponentType } from "react";
import {
  ApiIcon,
  BentoIcon,
  ClipboardCheckIcon,
  FilmIcon,
  GraduationIcon,
  PenToolIcon,
  ShieldCheckIcon,
  TeamIcon,
  TypeIcon,
  ChipIcon,
  DatabaseIcon,
  IconLibraryIcon,
  RocketIcon,
  SearchIcon,
  ShieldLockIcon,
  SmileCursorIcon,
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
  {
    title: "Secure storage and sign-in",
    description: "Every sign-in is confirmed with an email code, and your library stays private to your account.",
    Icon: ShieldLockIcon,
  },
  {
    title: "User friendly",
    description: "Simple forms, keyboard-friendly controls and clear messages when something needs attention.",
    Icon: SmileCursorIcon,
  },
];

export const categories: LandingItem[] = [
  { title: "Icon Libraries", description: "Icon sets and glyph collections.", Icon: IconLibraryIcon },
  { title: "Deployment", description: "Hosting, CI and deploy platforms.", Icon: RocketIcon },
  { title: "Databases", description: "Data stores, ORMs and admin tools.", Icon: DatabaseIcon },
  { title: "AI Agents", description: "Assistants, agents and model playgrounds.", Icon: ChipIcon },
  { title: "Courses & Trainings", description: "Courses, tutorials and certification tracks.", Icon: GraduationIcon },
  { title: "APIs", description: "Public APIs, SDKs and API testing tools.", Icon: ApiIcon },
  { title: "Typography", description: "Font libraries, pairings and type scales.", Icon: TypeIcon },
  { title: "Animations", description: "Motion libraries, Lottie files and easing tools.", Icon: FilmIcon },
  { title: "Design Tools", description: "Design apps, colour pickers and mockup kits.", Icon: PenToolIcon },
  { title: "Team Collab", description: "Chat, docs and whiteboards for working together.", Icon: TeamIcon },
  { title: "Security", description: "Scanners, secrets managers and auth services.", Icon: ShieldCheckIcon },
  { title: "Planning Tools", description: "Roadmaps, boards and diagramming apps.", Icon: ClipboardCheckIcon },
];

/** Cards per slide in the landing-page category carousel. */
export const CATEGORIES_PER_SLIDE = 4;
