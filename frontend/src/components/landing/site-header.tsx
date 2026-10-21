import Link from "next/link";
import { HeaderAuthControls } from "@/components/auth/auth-controls";
import { ReinMark } from "@/components/brand/rein-mark";
import { navLinks } from "./content";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rein-line py-5">
      <Link href="/" className="flex items-center gap-2.5 text-white">
        <ReinMark size={36} />
        <span className="text-[22px] font-semibold tracking-[-0.03em]">Rein</span>
      </Link>
      <nav aria-label="Main" className="order-3 flex w-full flex-wrap gap-7 text-[15px] md:order-none md:w-auto">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} className="text-violet-300 transition-colors hover:text-white">
            {link.label}
          </a>
        ))}
      </nav>
      <HeaderAuthControls />
    </header>
  );
}
