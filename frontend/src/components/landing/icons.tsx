import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 40, strokeWidth = 1.5, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const BentoIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" /></Icon>
);
export const SearchIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></Icon>
);
export const SparkIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" /></Icon>
);
export const SyncIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 18a4 4 0 010-8 5 5 0 019.6-1.5A3.5 3.5 0 0117 18z" />
    <path d="M12 12v5M9.5 14.5L12 12l2.5 2.5" />
  </Icon>
);
export const IconLibraryIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" />
    <path d="M18 3v4M16 5h4" />
  </Icon>
);
export const RocketIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2c3 2.5 4.5 6 4.5 10L14 16h-4l-2.5-4C7.5 8 9 4.5 12 2z" />
    <circle cx="12" cy="9" r="1.6" />
    <path d="M10 16l-2 5M14 16l2 5M12 16v4" />
  </Icon>
);
export const DatabaseIcon = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
    <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
  </Icon>
);
export const ChipIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="6" width="12" height="12" />
    <rect x="9.5" y="9.5" width="5" height="5" />
    <path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" />
  </Icon>
);
