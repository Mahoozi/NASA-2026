"use client";
// Nav links with the current page marked. Split from nav.tsx because it reads the URL.
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

const base =
  "relative py-1 transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity";

export function NavLinks({ links, pathname }: { links: NavLink[]; pathname: string | null }) {
  return (
    <>
      {links.map((l) => {
        const current = pathname === l.href || pathname?.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={current ? "page" : undefined}
            className={`${base} ${current ? "text-foreground after:opacity-100" : ""}`}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}

export function CurrentNavLinks({ links }: { links: NavLink[] }) {
  return <NavLinks links={links} pathname={usePathname()} />;
}
