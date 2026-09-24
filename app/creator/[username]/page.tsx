import { notFound } from "next/navigation";
import SubscribeButton from "@/components/SubscribeButton";
import ProfileTabs from "@/components/ProfileTabs";
import ReportButton from "@/components/ReportButton";

async function getCreatorData(username: string) {
  const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/posts?username=${username}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  return res.json();
}

export default async function CreatorPage({ params }: { params: { username: string } }) {
  const data = await getCreatorData(params.username);
  if (!data) notFound();

  const { creator, reels, content, viewerHasActiveSub } = data;

  return (
    <main className="mx-auto max-w-2xl pb-16">
      {/* Cover photo */}
      <div className="h-40 w-full bg-[#1a0505] sm:h-52">
        {creator.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="px-4">
        {/* Avatar overlaps the cover, like X */}
        <div className="-mt-12 flex items-end justify-between">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-black bg-[#1a0505]">
            {creator.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          {!viewerHasActiveSub ? (
            <SubscribeButton username={creator.username} monthlyPriceCents={creator.monthlyPriceCents} />
          ) : (
            <a
              href={`/messages/${creator.username}`}
              className="rounded-full border border-red-900/60 px-4 py-2 text-sm text-white hover:bg-red-950/40"
            >
              💬 Message
            </a>
          )}
        </div>

        <h1 className="mt-3 text-xl font-bold text-white">{creator.displayName}</h1>
        <p className="text-stone-500">@{creator.username}</p>
        {creator.bio && <p className="mt-3 whitespace-pre-line text-stone-200">{creator.bio}</p>}

        <div className="mt-3 flex items-center justify-between text-sm text-stone-400">
          <span className="font-semibold text-white">{creator.subscriberCount}</span> subscriber
          {creator.subscriberCount === 1 ? "" : "s"}
        </div>
        <div className="mt-2"><ReportButton targetType="USER" targetId={creator.userId} label="Report account" /></div>

        <div className="mt-4 rounded-2xl border border-red-900/40 bg-[--card] p-3 text-sm text-stone-300">
          Reels are completely free to watch. The <span className="text-white">₦3,700/month FAN pass</span> unlocks creator live streams, while subscribing to {creator.displayName} directly
          (button above) unlocks this creator's exclusive Content tab.
        </div>
      </div>

      <div className="mt-4">
        <ProfileTabs
          reels={reels}
          content={content}
          monthlyPriceCents={creator.monthlyPriceCents}
          username={creator.username}
        />
      </div>
    </main>
  );
}
