// Person A — the one line the Lab shows under its Summary when the scenario's material has
// ISS hardware on NASA's watchlist. No other Lab output changes.
import Link from "next/link";
import { watchlistLineText } from "./watchlist";

export function WatchlistLine({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <p className="text-sm">
      <Link href="/watchlist" className="underline underline-offset-4 hover:text-foreground">
        {watchlistLineText(count)}
      </Link>
    </p>
  );
}
