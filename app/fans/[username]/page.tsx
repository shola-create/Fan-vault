import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import FanMessageClient from "@/components/FanMessageClient";
import FollowButton from "@/components/FollowButton";
import { prisma } from "@/lib/prisma";

export default async function FanProfilePage({ params }: { params: { username: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const viewerId = (session.user as any).id as string;
  const target = await prisma.user.findFirst({ where: { OR: [{ username: params.username }, { id: params.username }] }, select: { id: true, name: true, avatarUrl: true } });
  if (!target) notFound();
  const stats = await prisma.follow.count({ where: { followingId: target.id } });
  const following = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: target.id } } });
  return <main className="mx-auto max-w-2xl px-6 py-10"><div className="rounded-2xl border border-stone-200 bg-white p-6"><div className="flex items-center gap-4"><div className="h-16 w-16 overflow-hidden rounded-full bg-stone-100">{target.avatarUrl && <img src={target.avatarUrl} alt="" className="h-full w-full object-cover" />}</div><div><h1 className="text-xl font-semibold">{target.name || "Fan"}</h1><p className="text-sm text-stone-500">{stats} follower{stats===1?"":"s"}</p></div></div>{target.id!==viewerId && <div className="mt-4 flex gap-2"><FollowButton userId={target.id} initialFollowing={Boolean(following)} /><a href={`/fans/${encodeURIComponent(params.username)}/message`} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Message</a></div>}</div></main>;
}
