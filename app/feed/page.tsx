import ReelsFeed from "@/components/ReelsFeed";
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

export default async function FeedPage() {
  const { items, nextCursor } = await getInitialFeed();
  return <ReelsFeed initialItems={items} initialCursor={nextCursor} />;
}
