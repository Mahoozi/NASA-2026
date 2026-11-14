// Person B will build this page.
import investigations from "@/data/investigations.sample.json";
import type { Investigation } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sampleInvestigations = investigations as Investigation[];

export default function InvestigationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Investigations</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {sampleInvestigations.map((inv) => (
          <Card key={inv.id}>
            <CardHeader>
              <CardTitle>{inv.acronym}</CardTitle>
              <CardDescription>{inv.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-1">
                {inv.safetyArea.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
              <p>{inv.objectives}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
