// Person A — /watchlist: ISS hardware named in NASA's NESC report, beside PSI flight evidence.
import type { Metadata } from "next";
import corpusJson from "../../data/corpus.json";
import runsJson from "../../data/runs.json";
import watchlistJson from "../../data/hardware_watchlist.json";
import type { CorpusDoc, Run } from "../../lib/schema";
import type { WatchlistEntry } from "./types";
import { WATCHLIST_TITLE } from "./watchlist";
import { WatchlistView } from "./watchlist-view";

export const metadata: Metadata = { title: `${WATCHLIST_TITLE} · Firebreak` };

export default function WatchlistPage() {
  return <WatchlistView entries={watchlistJson as WatchlistEntry[]} runs={runsJson as Run[]} corpus={corpusJson as CorpusDoc[]} />;
}
