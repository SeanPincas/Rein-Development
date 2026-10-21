/**
 * Clerk theme for Rein: Clerk keeps the auth logic (codes, social sign-in, errors),
 * these tokens and classes give its card the blueprint look.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#a78bfa",
    colorPrimaryForeground: "#000000",
    colorBackground: "#07050f",
    colorForeground: "#ffffff",
    colorMutedForeground: "#cfc8ee",
    colorNeutral: "#cfc8ee",
    colorInput: "#000000",
    colorInputForeground: "#ffffff",
    colorBorder: "rgb(167 139 250 / 0.3)",
    colorRing: "#a78bfa",
    colorModalBackdrop: "rgb(0 0 0 / 0.75)",
    fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
    borderRadius: "10px",
  },
  elements: {
    cardBox: "w-full max-w-[440px] rounded-none border border-rein-border-strong shadow-[0_0_80px_rgb(124_58_237/0.25)]",
    card: "rounded-none bg-rein-surface",
    headerTitle: "text-2xl font-bold tracking-[-0.02em]",
    headerSubtitle: "text-rein-soft",
    socialButtonsBlockButton: "border-rein-border bg-black hover:bg-violet-950/40",
    dividerLine: "bg-rein-line",
    dividerText: "font-mono text-[11px] tracking-[0.12em] text-rein-label",
    formFieldLabel: "text-white",
    formFieldInput: "border-rein-border bg-black text-white",
    formButtonPrimary: "bg-rein-accent font-semibold text-black hover:bg-violet-300",
    footer: "bg-none bg-black/60",
    footerActionText: "text-rein-soft",
    footerActionLink: "font-semibold text-rein-accent hover:text-white",
  },
};
