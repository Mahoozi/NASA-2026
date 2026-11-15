import { Suspense } from "react";
import Link from "next/link";
import { CurrentNavLinks, NavLinks } from "./nav-links";

const links = [
  { href: "/lab", label: "Lab" },
  { href: "/ask", label: "Ask" },
  { href: "/investigations", label: "Investigations" },
  { href: "/earth", label: "Earth" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/evals", label: "Evals" },
];

export function Nav() {
  return (
    <header className="top-0 z-40 border-b border-border bg-background/70 backdrop-blur-md sm:sticky print:static">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight">
          {/* The brand spark: the only place ember orange appears outside the intro. */}
          <span
            aria-hidden
            className="size-2 rounded-full bg-(--ember) shadow-[0_0_10px_2px_var(--ember)]"
          />
          Firebreak
        </Link>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {/* Until the URL is known, the links render with none marked. */}
          <Suspense fallback={<NavLinks links={links} pathname={null} />}>
            <CurrentNavLinks links={links} />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}
