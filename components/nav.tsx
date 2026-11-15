import Link from "next/link";

const links = [
  { href: "/lab", label: "Lab" },
  { href: "/ask", label: "Ask" },
  { href: "/investigations", label: "Investigations" },
  { href: "/earth", label: "Earth" },
  { href: "/evals", label: "Evals" },
];

export function Nav() {
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Firebreak
        </Link>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
