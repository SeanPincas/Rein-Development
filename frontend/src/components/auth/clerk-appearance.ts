/** Sign-in / sign-up card: a fixed-width blueprint card (scoped so it can't squeeze other Clerk UI). */
const authCardElements = {
  cardBox: "w-full max-w-[440px] rounded-none border border-rein-border-strong shadow-[0_0_80px_rgb(124_58_237/0.25)]",
  card: "rounded-none bg-rein-surface",
};

/**
 * Account settings (<UserProfile/>, opened from the avatar menu): full-screen sheet on
 * phones, a wide two-pane panel from tablets up, in Rein's blueprint styling.
 */
export const userProfileAppearance = {
  elements: {
    modalBackdrop: "items-stretch p-0 backdrop-blur-sm sm:items-center sm:p-4",
    modalContent: "m-0 w-full max-w-none sm:my-auto sm:w-[min(960px,calc(100vw-32px))]",
    cardBox:
      "h-dvh w-full max-w-none rounded-none border-0 bg-[#07050f] shadow-none sm:h-[min(680px,calc(100dvh-32px))] sm:rounded-[20px] sm:border sm:border-rein-border-strong sm:shadow-[0_0_120px_rgb(124_58_237/0.3)]",
    // Left menu (desktop) / slide-over menu (mobile).
    navbar: "bg-black/60 bg-none sm:border-r sm:border-dashed sm:border-rein-border",
    navbarButton: "rounded-[10px] text-rein-muted hover:bg-violet-500/10 hover:text-white",
    navbarMobileMenuRow: "border-b border-dashed border-rein-border bg-black/60",
    navbarMobileMenuButton: "text-white",
    // Right pane.
    scrollBox: "rounded-none bg-[#0a0618] bg-none",
    pageScrollBox: "px-4 py-6 sm:px-8 sm:py-8",
    headerTitle: "text-[26px] font-bold tracking-[-0.02em] sm:text-[28px]",
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
    avatarBox: "ring-2 ring-rein-accent/40 ring-offset-2 ring-offset-[#0a0618]",
    badge: "border border-rein-accent/40 bg-rein-accent/15 text-violet-200",
    menuButton: "rounded-lg text-rein-label hover:bg-violet-500/15 hover:text-violet-200",
    menuList: "rounded-xl border border-rein-border-strong bg-[#0d0820] shadow-[0_18px_50px_rgb(0_0_0/0.6)]",
    menuItem: "rounded-lg hover:bg-violet-500/15",
    actionCard: "rounded-xl border border-rein-border-strong bg-black/40",
    formButtonReset: "rounded-[10px] text-rein-soft hover:bg-white/5 hover:text-white",
    modalCloseButton: "rounded-[10px] text-rein-soft hover:bg-white/5 hover:text-white",
    footer: "border-t border-rein-line bg-black/60 bg-none",
  },
};

/**
 * Navbar avatar and its menu (<UserButton/>): responsive ringed avatar; the menu is a
 * dark violet card with a dashed rule under the user, violet hover rows, and a red
 * hover on Sign out.
 */
export const userButtonAppearance = {
  elements: {
    // Trigger: 32px phone / 36px tablet / 40px desktop (Clerk's default is 28px).
    userButtonAvatarBox:
      "size-8 ring-2 ring-rein-accent/40 ring-offset-1 ring-offset-black transition-shadow hover:ring-rein-accent sm:size-9 sm:ring-offset-2 min-[1200px]:size-10",
    userButtonPopoverCard:
      "w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-[18px] border border-rein-border-strong bg-[#0a0618] shadow-[0_24px_70px_rgb(0_0_0/0.65),0_0_60px_rgb(124_58_237/0.25)]",
    userButtonPopoverMain: "rounded-none bg-[#0a0618] bg-none shadow-none",
    userPreview__userButton: "border-b border-dashed border-rein-border pb-4",
    userPreviewAvatarBox__userButton: "size-11 ring-2 ring-rein-accent/40 ring-offset-2 ring-offset-[#0a0618]",
    userPreviewMainIdentifierText__userButton: "text-[15px] font-semibold text-white",
    userPreviewSecondaryIdentifier__userButton: "font-mono text-[11px] tracking-[0.04em] text-rein-label",
    userButtonPopoverActions: "gap-1 border-0 p-2",
    userButtonPopoverActionButton:
      "rounded-[10px] px-3 py-2.5 text-[14px] font-medium text-white/85 transition-colors hover:bg-violet-500/15 hover:text-white",
    userButtonPopoverActionButtonIcon: "text-violet-300",
    userButtonPopoverActionButton__signOut: "hover:bg-red-500/10! hover:text-red-200!",
    userButtonPopoverActionButtonIcon__signOut: "text-rein-label",
    userButtonPopoverFooter: "border-t border-rein-line bg-black/60 bg-none",
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
