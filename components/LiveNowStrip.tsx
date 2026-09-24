"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LiveRoom = {
  id: string;
  roomName: string;
  title: string;
  startedAt: string;
  creator: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export default function LiveNowStrip() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);

  const loadLiveRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/live/list", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {
      // Live discovery is non-critical to the feed; keep the current state.
    }
  }, []);

  useEffect(() => {
    loadLiveRooms();
    const interval = window.setInterval(loadLiveRooms, 10000);
    return () => window.clearInterval(interval);
  }, [loadLiveRooms]);

  if (rooms.length === 0) return null;

  return (
    <section className="border-b border-stone-200 bg-white px-4 py-3">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">Live now</h2>
          <Link href="/live" className="text-xs font-medium text-stone-500 hover:text-stone-900">
            See all
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/live/${room.roomName}`}
              className="group flex w-16 shrink-0 flex-col items-center gap-1"
              title={`${room.creator.displayName} is live: ${room.title}`}
            >
              <span className="relative rounded-full bg-gradient-to-br from-red-500 via-pink-500 to-orange-400 p-[3px]">
                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-stone-200 text-lg font-semibold text-stone-700">
                  {room.creator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={room.creator.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    room.creator.displayName[0]?.toUpperCase() ?? "?"
                  )}
                </span>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                  LIVE
                </span>
              </span>
              <span className="w-full truncate text-center text-xs text-stone-700 group-hover:font-medium">
                {room.creator.displayName}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
