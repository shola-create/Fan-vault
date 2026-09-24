import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FanMessageClient from "@/components/FanMessageClient";
export default async function Page({params}:{params:{username:string}}){const session=await getServerSession(authOptions);if(!session?.user)redirect('/login');const target=await prisma.user.findFirst({where:{OR:[{username:params.username},{id:params.username}]},select:{id:true,name:true}});if(!target)notFound();return <FanMessageClient userId={target.id} name={target.name||'Fan'}/>}
