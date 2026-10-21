import { About } from "@/components/landing/about";
import { Categories } from "@/components/landing/categories";
import { ClosingCta } from "@/components/landing/closing-cta";
import { navLinks } from "@/components/landing/content";
import { Hero } from "@/components/landing/hero";
import { SiteFooter } from "@/components/landing/site-footer";
import { AppShell } from "@/components/layout/app-shell";
import { Navbar } from "@/components/navigation/navbar";

export default function Home() {
  return (
    <AppShell nav={<Navbar links={navLinks} />}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-24 px-6 pb-12 pt-14">
        <main className="flex flex-col gap-24">
          <Hero />
          <About />
          <Categories />
          <ClosingCta />
        </main>
        <SiteFooter />
      </div>
    </AppShell>
  );
}
