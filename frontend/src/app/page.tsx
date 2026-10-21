import { About } from "@/components/landing/about";
import { BlueprintBackdrop } from "@/components/landing/blueprint-backdrop";
import { Categories } from "@/components/landing/categories";
import { ClosingCta } from "@/components/landing/closing-cta";
import { Hero } from "@/components/landing/hero";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function Home() {
  return (
    <div className="blueprint-grid relative isolate min-h-screen overflow-hidden">
      <BlueprintBackdrop />
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-24 px-6 pb-12">
        <SiteHeader />
        <main className="flex flex-col gap-24">
          <Hero />
          <About />
          <Categories />
          <ClosingCta />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
