"use client";

import { useState } from "react";
import ReelsGrid from "./ReelsGrid";
import PostCard from "./PostCard";

type Reel = { id: string; mediaType: "image" | "video"; mediaUrl: string };
type ContentPost = {
  id: string;
  caption: string | null;
  mediaType: "image" | "video";
  mediaUrl: string | null;
  locked: boolean;
  createdAt: string;
};

export default function ProfileTabs({
  reels,
  content,
  monthlyPriceCents,
  username,
}: {
  reels: Reel[];
  content: ContentPost[];
  monthlyPriceCents: number;
  username: string;
}) {
  const [tab, setTab] = useState<"reels" | "content">("reels");

  return (
    <div>
      <div className="flex border-b border-red-900/40">
        <button
          onClick={() => setTab("reels")}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            tab === "reels" ? "border-b-2 border-[--accent] text-white" : "text-stone-500"
          }`}
        >
          Reels
        </button>
        <button
          onClick={() => setTab("content")}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            tab === "content" ? "border-b-2 border-[--accent] text-white" : "text-stone-500"
          }`}
        >
          Content
        </button>
      </div>

      <div className="pt-4">
        {tab === "reels" ? (
          <ReelsGrid reels={reels} />
        ) : (
          <div className="flex flex-col gap-6">
            {content.length === 0 && (
              <p className="py-10 text-center text-stone-500">
                This creator hasn't posted any exclusive content yet.
              </p>
            )}
            {content.map((post) => (
              <PostCard key={post.id} post={post} monthlyPriceCents={monthlyPriceCents} username={username} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
