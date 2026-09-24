import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MessagesClient from "@/components/MessagesClient";

export default async function MessagesPage({ params, searchParams }: { params:{username:string}; searchParams:{fan?:string} }) {
 const session=await getServerSession(authOptions);
 if(!session?.user) redirect("/login");
 const viewerId=(session.user as any).id as string;
 const creator=await prisma.creatorProfile.findUnique({where:{username:params.username}});
 if(!creator) notFound();
 const isCreator=creator.userId===viewerId;
 let canMessage=isCreator;
 if(!isCreator){
   const sub=await prisma.subscription.findUnique({where:{fanId_creatorId:{fanId:viewerId,creatorId:creator.id}}});
   canMessage=sub?.status==="active";
 }
 return <main className="mx-auto max-w-2xl px-6 py-10">
   <MessagesClient username={creator.username} viewerId={viewerId} fanId={isCreator?searchParams.fan:undefined} creatorName={creator.displayName} canMessage={canMessage}/>
 </main>
}
