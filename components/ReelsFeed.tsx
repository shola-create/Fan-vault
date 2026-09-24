"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useCurrency } from "./CurrencyProvider";

type FeedItem = {
  id: string;
  caption: string | null;
  mediaType: "image" | "video";
  mediaUrl: string | null;
  locked: boolean;
  lockReason?: "paywall" | "daily_limit" | null;
  likeCount: number;
  likedByViewer: boolean;
  creator: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    monthlyPriceCents: number;
  };
};

export default function ReelsFeed({ initialItems, initialCursor }: {
  initialItems: FeedItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    const res = await fetch(`/api/feed?cursor=${cursor}&limit=10`);
    const data = await res.json();
    setItems((prev) => [...prev, ...data.items]);
    setCursor(data.nextCursor);
    setLoading(false);
  }, [cursor, loading]);

  // Infinite scroll: watch a sentinel div near the bottom of the list.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "800px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-stone-400">
        <p>No reels yet — check back soon.</p>
        <Link href="/signup" className="rounded-full bg-[--accent] px-5 py-2 text-sm font-medium text-white">
          Create your account
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen snap-y snap-mandatory overflow-y-scroll bg-black">
      {items.map((item) => (
        <FeedSlide key={item.id} item={item} />
      ))}
      <div ref={sentinelRef} className="h-1" />
      {loading && (
        <div className="flex h-20 items-center justify-center text-sm text-stone-400">
          Loading more…
        </div>
      )}
    </div>
  );
}

function FeedSlide({ item }: { item: FeedItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(item.likedByViewer);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const { format } = useCurrency();

  // Autoplay the video only while its slide is the one in view; pause
  // everything else. This is what makes a scroll feed feel like TikTok
  // instead of a page of videos all fighting for audio.
  useEffect(() => {
    const video = videoRef.current;
    const slide = slideRef.current;
    if (!video || !slide) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  async function toggleLike() {
    if (item.locked) return;
    // Optimistic update
    setLiked((prev) => !prev);
    setLikeCount((prev) => prev + (liked ? -1 : 1));

    const res = await fetch(`/api/posts/${item.id}/like`, { method: "POST" });
    if (!res.ok) {
      // Revert on failure (e.g. not subscribed, not authed)
      setLiked((prev) => !prev);
      setLikeCount((prev) => prev + (liked ? 1 : -1));
      if (res.status === 401) window.location.href = "/login";
    } else {
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    }
  }

  return (
    <div
      ref={slideRef}
      className="relative flex h-screen w-full snap-start snap-always items-center justify-center bg-stone-950"
    >
      {/* Media */}
      {item.locked ? (
        <div className="flex flex-col items-center gap-3 px-8 text-center text-white">
          <span className="text-4xl">🔒</span>
          {item.lockReason === "daily_limit" ? (
            <>
              <p className="text-sm text-stone-300">You've watched today's free reels.</p>
              <Link href="/dashboard" className="mt-1 rounded-full bg-[--accent] px-4 py-2 text-sm font-medium text-white">
                Get unlimited access
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-300">
                Subscribe to {item.creator.displayName} for {`₦${(item.creator.monthlyPriceCents / 100).toLocaleString()}`}/mo to unlock
              </p>
              <Link
                href={`/creator/${item.creator.username}`}
                className="mt-1 rounded-full bg-[--accent] px-4 py-2 text-sm font-medium text-white"
              >
                View profile
              </Link>
            </>
          )}
        </div>
      ) : item.mediaType === "video" ? (
        <video
          ref={videoRef}
          src={item.mediaUrl ?? ""}
          className="h-full w-full object-contain"
          loop
          muted
          playsInline
          controls={false}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.mediaUrl ?? ""} alt={item.caption ?? ""} className="h-full w-full object-contain" />
      )}

      {/* Bottom overlay: creator + caption */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pb-8 text-white">
        <Link href={`/creator/${item.creator.username}`} className="flex items-center gap-2 font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-700 text-sm">
            {item.creator.displayName[0]?.toUpperCase()}
          </span>
          @{item.creator.username}
        </Link>
        {item.caption && !item.locked && (
          <p className="mt-2 max-w-md text-sm text-stone-100">{item.caption}</p>
        )}
      </div>

      {/* Right-side action rail */}
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 text-white">
        <button
          onClick={toggleLike}
          disabled={item.locked}
          className="flex flex-col items-center gap-1 disabled:opacity-40"
        >
          <span className={`text-2xl ${liked ? "text-red-500" : ""}`}>{liked ? "♥" : "♡"}</span>
          <span className="text-xs">{likeCount}</span>
        </button>
        <Link
          href={`/creator/${item.creator.username}`}
          className="flex flex-col items-center gap-1 text-2xl"
        >
          👤
        </Link>
      </div>
    </div>
  );
}
