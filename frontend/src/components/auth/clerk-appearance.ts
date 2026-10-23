/** Sign-in / sign-up card: a fixed-width blueprint card (scoped so it can't squeeze other Clerk UI). */
const authCardElements = {
  cardBox: "w-full max-w-[440px] rounded-none border border-rein-border-strong shadow-[0_0_80px_rgb(124_58_237/0.25)]",
  card: "rounded-none bg-rein-surface",
};

/**
 * Clerk's <UserProfile> embedded in Rein's Account modal ("Emails & logins" and
 * "Security" tabs): no card chrome, no Clerk nav (Rein's modal has its own), and
 * Clerk's own profile card hidden (Rein's Profile tab replaces it). Element keys only,
 * no structural selectors, so Clerk updates can't break the layout.
 */
export const userProfileAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full max-w-none h-auto rounded-none border-0 bg-transparent shadow-none",
    navbar: "hidden",
    navbarMobileMenuRow: "hidden",
    scrollBox: "rounded-none bg-transparent bg-none shadow-none",
    pageScrollBox: "p-0",
    headerTitle: "text-[24px] font-bold tracking-[-0.02em] sm:text-[26px]",
    profileSection__profile: "hidden",
    profileSection: "border-t border-dashed border-rein-border pt-5 first:border-t-0",
    profileSectionTitleText: "font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rein-label",
    profileSectionPrimaryButton: "rounded-[10px] text-violet-300 hover:bg-violet-500/10 hover:text-white",
    profileSectionItem: "text-white",
    // Danger zone (Delete account): red panel, title and button. `!` beats the violet section styles above.
    profileSection__danger:
      "mt-3 rounded-xl border! border-solid! border-red-400/35! bg-red-500/[0.06] p-4 first:border-t! sm:p-5",
    profileSectionTitleText__danger: "text-red-300!",
    profileSectionPrimaryButton__danger:
      "border border-red-400/40 bg-red-500/10 px-3 text-red-300! hover:bg-red-500/20! hover:text-red-200!",
    avatarBox: "ring-2 ring-rein-accent/40 ring-offset-2 ring-offset-[#07050f]",
    badge: "border border-rein-accent/40 bg-rein-accent/15 text-violet-200",
    menuButton: "rounded-lg text-rein-label hover:bg-violet-500/15 hover:text-violet-200",
    menuList: "rounded-xl border border-rein-border-strong bg-[#0d0820] shadow-[0_18px_50px_rgb(0_0_0/0.6)]",
    menuItem: "rounded-lg hover:bg-violet-500/15",
    actionCard: "rounded-xl border border-rein-border-strong bg-black/40",
    formButtonReset: "rounded-[10px] text-rein-soft hover:bg-white/5 hover:text-white",
    footer: "border-t border-rein-line bg-transparent bg-none",
  },
};

/**
 * Clerk theme for Rein: Clerk keeps the auth logic (codes, social sign-in, errors),
 * these tokens and classes give its UI the blueprint look.
 */
export const clerkAppearance = {
  // Clerk's styles go in a lower cascade layer (declared in globals.css) so the
  // Tailwind classes in `elements` below win over Clerk's defaults.
  cssLayerName: "clerk",
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
    colorDanger: "#f87171",
    colorModalBackdrop: "rgb(0 0 0 / 0.75)",
    fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
    borderRadius: "10px",
  },
  elements: {
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
  signIn: { elements: authCardElements },
  signUp: { elements: authCardElements },
  userProfile: userProfileAppearance,
};
