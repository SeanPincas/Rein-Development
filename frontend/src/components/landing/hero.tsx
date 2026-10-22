import { StartLibraryButton } from "@/components/auth/auth-controls";
import { buttonStyles } from "@/components/ui/styles";
import Image from "next/image";
import libraryPreview from "./library-preview.webp";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="flex flex-wrap items-center gap-14">
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-7">
        <p className="m-0 inline-flex items-center gap-2.5 self-start rounded-full border border-rein-border px-3 py-2 font-mono text-xs tracking-[0.1em] text-violet-300">
          <span aria-hidden="true" className="inline-block size-1.5 bg-rein-accent" />
          YOUR PERSONAL DEV LIBRARY
        </p>
        <h1
          id="hero-title"
          className="m-0 text-[clamp(44px,7vw,84px)] font-bold leading-[0.98] tracking-[-0.045em]"
        >
          Save your{" "}
          <s className="relative inline-block whitespace-nowrap text-white/55 no-underline">
            poison
            {/* Custom strike: a solid bar through the vertical centre, thicker than the default line-through. */}
            <span
              aria-hidden="true"
              className="absolute -inset-x-[0.06em] top-[54%] h-[0.08em] -translate-y-1/2 -rotate-2 bg-rein-accent"
            />
            <span className="sr-only"> (crossed out)</span>
          </s>
          <br />
          <span className="text-rein-accent">Dev Tools</span>
        </h1>
        <p className="m-0 max-w-[520px] text-lg leading-relaxed text-rein-muted">
          Save developer tools, design resources, courses and references once. Find them by name or
          purpose in any browser, on any device.
        </p>
        <div className="flex flex-wrap gap-3">
          <StartLibraryButton />
          <a href="#how-it-works" className={buttonStyles.outline}>
            See how it works
          </a>
        </div>
      </div>
      <div className="min-w-0 flex-[1_1_520px]">
        {/* Real library screenshot; the bottom fades out because the cards continue below the crop. */}
        <div className="overflow-hidden rounded-[20px] border border-rein-border-strong bg-black shadow-[0_30px_90px_rgb(0_0_0/0.6),0_0_80px_rgb(124_58_237/0.25)] [mask-image:linear-gradient(to_bottom,#000_72%,transparent)]">
          <Image
            src={libraryPreview}
            alt="The Rein library: categories such as UI & Design, AI Agents and Databases, each listing saved tools with their logos and descriptions."
            sizes="(min-width: 1200px) 600px, (min-width: 768px) 90vw, 100vw"
            placeholder="blur"
            preload
            className="block h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
