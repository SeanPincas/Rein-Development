/**
 * Stable category icon contract shared by backend validation and frontend UI.
 *
 * Persist `key` in PostgreSQL. The `heroicon` value is a presentation hint for
 * the frontend renderer and may be refactored without migrating saved records.
 */
export const categoryIconLibrary = [
  { key: "general", label: "General", heroicon: "Squares2X2Icon" },
  { key: "icon-libraries", label: "Icon Libraries", heroicon: "SparklesIcon" },
  { key: "motion", label: "Motion & Animation", heroicon: "FilmIcon" },
  { key: "deployment", label: "Deployment", heroicon: "RocketLaunchIcon" },
  { key: "databases", label: "Databases", heroicon: "CircleStackIcon" },
  { key: "courses", label: "Courses", heroicon: "AcademicCapIcon" },
  { key: "ui-reference", label: "UI Reference", heroicon: "SwatchIcon" },
  { key: "ai-agents", label: "AI Agents", heroicon: "CpuChipIcon" },
  {
    key: "planning",
    label: "Planning",
    heroicon: "ClipboardDocumentCheckIcon",
  },
  {
    key: "developer-tools",
    label: "Developer Tools",
    heroicon: "WrenchScrewdriverIcon",
  },
  { key: "code", label: "Code", heroicon: "CodeBracketIcon" },
  { key: "terminal", label: "Terminal", heroicon: "CommandLineIcon" },
  { key: "cloud", label: "Cloud", heroicon: "CloudIcon" },
  { key: "packages", label: "Packages", heroicon: "CubeTransparentIcon" },
  { key: "experiments", label: "Experiments", heroicon: "BeakerIcon" },
  { key: "documentation", label: "Documentation", heroicon: "BookOpenIcon" },
  { key: "ideas", label: "Ideas", heroicon: "LightBulbIcon" },
  { key: "integrations", label: "Integrations", heroicon: "PuzzlePieceIcon" },
  { key: "design", label: "Design", heroicon: "PaintBrushIcon" },
  { key: "security", label: "Security", heroicon: "ShieldCheckIcon" },
  { key: "analytics", label: "Analytics", heroicon: "ChartBarIcon" },
  { key: "performance", label: "Performance", heroicon: "BoltIcon" },
] as const;

export type CategoryIconOption = (typeof categoryIconLibrary)[number];
export type CategoryIconKey = CategoryIconOption["key"];
export type CategoryHeroiconName = CategoryIconOption["heroicon"];

export const categoryIconKeys = categoryIconLibrary.map(
  ({ key }) => key,
) as readonly CategoryIconKey[];

export const defaultCategoryIconKey: CategoryIconKey = "general";

const categoryIconsByKey = new Map<CategoryIconKey, CategoryIconOption>(
  categoryIconLibrary.map((option) => [option.key, option]),
);

export function isCategoryIconKey(value: string): value is CategoryIconKey {
  return categoryIconsByKey.has(value as CategoryIconKey);
}

export function getCategoryIconOption(
  key: CategoryIconKey,
): CategoryIconOption {
  return categoryIconsByKey.get(key) ?? categoryIconsByKey.get(defaultCategoryIconKey)!;
}
