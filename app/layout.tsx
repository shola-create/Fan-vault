import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "FanVault",
  description: "Subscribe, watch live, and support your favorite creators.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;
  const userId = (session?.user as any)?.id as string | undefined;

  const userProfile = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })
    : null;

  const creatorProfile = userId
    ? await prisma.creatorProfile.findUnique({
        where: { userId },
        select: { username: true, displayName: true, avatarUrl: true },
      })
    : null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <CurrencyProvider>
          <Sidebar
            isLoggedIn={isLoggedIn}
            isCreator={!!creatorProfile}
            displayName={creatorProfile?.displayName ?? session?.user?.name ?? null}
            avatarUrl={creatorProfile?.avatarUrl ?? userProfile?.avatarUrl ?? null}
            profileHref={creatorProfile ? `/creator/${creatorProfile.username}` : "/dashboard"}
          />
          <div className="md:pl-60">{children}</div>
        </CurrencyProvider>
      </body>
    </html>
  );
}
