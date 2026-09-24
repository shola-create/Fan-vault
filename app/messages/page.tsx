import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InboxClient from "@/components/InboxClient";

export default async function InboxPage() {
 const session=await getServerSession(authOptions);
 if(!session?.user) redirect("/login");
 const userId=(session.user as any).id as string;
 const creator=await prisma.creatorProfile.findUnique({where:{userId}});
 if(!creator) notFound();
 return <InboxClient username={creator.username}/>;
}
