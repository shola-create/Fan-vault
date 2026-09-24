"use client";


type Reel = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
};

// Every free reel a creator has posted, laid out as a 3-column grid.
// Reels are completely free; only posts marked as exclusive are gated.
export default function ReelsGrid({
  reels,
}: {
  reels: Reel[];
}) {

  if (reels.length === 0) {
    return <p className="py-10 text-center text-stone-500">No reels yet.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {reels.map((reel) => (
        <div key={reel.id} className="relative aspect-[3/4] overflow-hidden bg-[#1a0505]">
          {reel.mediaType === "video" ? (
            <video
              src={reel.mediaUrl}
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={reel.mediaUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}


        </div>
      ))}
    </div>
  );
}
