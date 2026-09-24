import ReelsFeed from "@/components/ReelsFeed";
import LiveNowStrip from "@/components/LiveNowStrip";
import { headers } from "next/headers";

async function getInitialFeed() {
  const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  // Forward the viewer's cookies so the server-side fetch is authenticated
  // the same way the browser is — otherwise the feed would always render
  // as a logged-out visitor and every paywalled post would show locked.
  const cookie = headers().get("cookie") ?? "";

  const res = await fetch(`${origin}/api/feed?limit=10`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) return { items: [], nextCursor: null };
  return res.json();
}

// The home page IS the feed — an X/TikTok-style vertical scroll of every
// creator's reels, open to guests as well as signed-in fans. Locked posts
// show a paywall prompt instead of the media.
export default async function Home() {
  const { items, nextCursor } = await getInitialFeed();
  return (
    <main className="h-screen overflow-hidden bg-black">
      <LiveNowStrip />
      <div className="h-[calc(100vh-104px)]">
        <ReelsFeed initialItems={items} initialCursor={nextCursor} />
      </div>
    </main>
  );
}
