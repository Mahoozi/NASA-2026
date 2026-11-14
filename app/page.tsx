import Link from "next/link";

const pages = [
  { href: "/lab", label: "Scenario Lab" },
  { href: "/ask", label: "Ask the evidence" },
  { href: "/investigations", label: "Investigations" },
  { href: "/evals", label: "Scorecard" },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        What NASA has burned in space, and what it hasn&apos;t.
      </h1>
      <ul className="space-y-2">
        {pages.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="underline underline-offset-4">
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
