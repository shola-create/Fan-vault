"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/components/CurrencyProvider";

type Creator = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  monthlyPriceCents: number;
};

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const { format } = useCurrency();

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/creators/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setCreators(d.creators ?? []))
        .finally(() => setLoading(false));
    }, 250); // debounce as the user types
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="sticky top-0 z-10 -mx-4 mb-4 bg-black px-4 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators"
          className="w-full rounded-full border border-red-900/50 bg-[--card] px-4 py-2.5 text-white placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[--accent]"
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-stone-500">Searching…</p>
      ) : creators.length === 0 ? (
        <p className="py-10 text-center text-stone-500">No creators found.</p>
      ) : (
        <div className="flex flex-col divide-y divide-red-900/30">
          {creators.map((c) => (
            <Link
              key={c.username}
              href={`/creator/${c.username}`}
              className="flex items-center gap-3 py-3 hover:bg-red-950/20"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#1a0505]">
                {c.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{c.displayName}</p>
                <p className="truncate text-sm text-stone-500">@{c.username}</p>
                {c.bio && <p className="mt-0.5 truncate text-sm text-stone-400">{c.bio}</p>}
              </div>
              <span className="shrink-0 text-sm text-stone-400">₦{(c.monthlyPriceCents/100).toLocaleString()}/mo</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
