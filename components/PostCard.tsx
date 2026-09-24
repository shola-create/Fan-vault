"use client";

import { useCurrency } from "./CurrencyProvider";
import ReportButton from "./ReportButton";

type Post = {
  id: string;
  caption: string | null;
  mediaType: "image" | "video";
  mediaUrl: string | null;
  locked: boolean;
  createdAt: string;
};

export default function PostCard({
  post,
  monthlyPriceCents,
  username,
}: {
  post: Post;
  monthlyPriceCents: number;
  username: string;
}) {
  const { format } = useCurrency();
  const priceLabel = `₦${(monthlyPriceCents / 100).toLocaleString()}/mo`;

  return (
    <article className="overflow-hidden rounded-2xl border border-red-900/40 bg-[--card]">
      <div className="relative aspect-[4/5] bg-[#1a0505]">
        {post.locked ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="text-3xl">🔒</span>
            <p className="text-sm text-stone-300">
              Subscribe for {priceLabel} to unlock this post
            </p>
          </div>
        ) : post.mediaType === "video" ? (
          <video src={post.mediaUrl ?? ""} controls className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.mediaUrl ?? ""} alt={post.caption ?? ""} className="h-full w-full object-cover" />
        )}
      </div>
      {post.caption && !post.locked && (
        <p className="px-4 py-3 text-stone-100">{post.caption}</p>
      )}
      <p className="px-4 pb-3 text-xs text-stone-500">
        {new Date(post.createdAt).toLocaleDateString()}
      </p>
      <div className="px-4 pb-3"><ReportButton targetType="POST" targetId={post.id} /></div>
    </article>
  );
}
