// Person B — one PSI investigation, text verbatim from data/investigations.json.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { docsFor, getInvestigation, investigations } from "../data";
import { fuelPhaseText, labHref, safetyLabel, shortName } from "../labels";

export function generateStaticParams() {
  return investigations.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: PageProps<"/investigations/[id]">): Promise<Metadata> {
  const inv = getInvestigation((await params).id);
  return { title: inv ? `${shortName(inv)} · Firebreak` : "Investigation not found · Firebreak" };
}

export default async function InvestigationPage({ params }: PageProps<"/investigations/[id]">) {
  const { id } = await params;
  const inv = getInvestigation(id);
  if (!inv) notFound();
  const docs = docsFor(inv.id);

  const sections: [string, string | undefined][] = [
    ["Objectives", inv.objectives],
    ["Approach", inv.approach],
    ["Hypothesis", inv.hypothesis],
    ["Research impacts and Earth benefits", inv.earthBenefits],
  ];

  return (
    <article className="flex flex-col gap-8">
      <Link href="/investigations" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        All investigations
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p translate="no" className="text-sm text-muted-foreground">
            {inv.id}
          </p>
          <h1 translate="no" className="text-2xl font-semibold text-balance">
            {shortName(inv)}
          </h1>
          <p className="max-w-prose text-lg text-pretty text-muted-foreground">{inv.name}</p>
        </div>

        <dl className="grid max-w-2xl grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Safety area</dt>
          <dd className="flex flex-wrap gap-1">
            {inv.safetyArea.map((s) => (
              <Badge key={s} variant="secondary">
                {safetyLabel(s)}
              </Badge>
            ))}
          </dd>
          <dt className="text-muted-foreground">Fuel phase</dt>
          <dd className={inv.fuelPhase.length ? undefined : "text-muted-foreground italic"}>
            {fuelPhaseText(inv)}
          </dd>
          <dt className="text-muted-foreground">Facility</dt>
          <dd>{inv.facility || <NotStated />}</dd>
          <dt className="text-muted-foreground">Platform</dt>
          <dd>{inv.platform || <NotStated />}</dd>
          <dt className="text-muted-foreground">Run data</dt>
          <dd>{inv.hasRunData ? "Yes, in the Lab" : "None in this app"}</dd>
        </dl>

        <div className="flex flex-wrap gap-2">
          <a href={inv.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            Open PSI page
          </a>
          {inv.hasRunData && (
            <Link href={labHref(inv.id)} className={buttonVariants()}>
              Open in Lab
            </Link>
          )}
        </div>
      </header>

      <Separator />

      <div className="flex flex-col gap-8">
        {sections.map(([heading, text]) => (
          <section key={heading} className="flex max-w-prose flex-col gap-2">
            <h2 className="text-lg font-semibold text-balance">{heading}</h2>
            {text ? (
              <p className="text-sm leading-relaxed break-words whitespace-pre-line">{text}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not given in the PSI record.</p>
            )}
          </section>
        ))}
        <p className="max-w-prose text-xs text-muted-foreground">
          Text above is copied from the investigation’s PSI record without editing.
        </p>
      </div>

      <Separator />

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-balance">Sources in the corpus</h2>
          <p className="text-sm text-muted-foreground">
            The documents the Ask page can cite for this investigation.
          </p>
        </div>
        {docs.length ? (
          <ul className="flex flex-col gap-1.5 text-sm">
            {docs.map((d) => (
              <li key={d.id}>
                <a href={d.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                  {d.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No corpus documents for this investigation.</p>
        )}
      </section>
    </article>
  );
}

function NotStated() {
  return <span className="text-muted-foreground italic">not stated</span>;
}
