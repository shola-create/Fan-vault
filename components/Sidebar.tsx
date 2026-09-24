import Link from "next/link";
import CurrencySelector from "./CurrencySelector";

const NAV_ICONS = {
  home: (
    <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  ),
  live: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="m8 10 5 3-5 3v-6Z" />
    </>
  ),
  search: <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" />,
  message: <path d="M4 5h16v11H7l-3 3V5Z" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />,
};

function NavIcon({ name }: { name: keyof typeof NAV_ICONS }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      {NAV_ICONS[name]}
    </svg>
  );
}

export default function Sidebar({
  isLoggedIn,
  isCreator,
  displayName,
  avatarUrl,
  profileHref,
}: {
  isLoggedIn: boolean;
  isCreator: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  profileHref: string;
}) {
  const navItems: { href: string; label: string; icon: keyof typeof NAV_ICONS; requiresAuth?: boolean }[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/live", label: "Live", icon: "live" },
    { href: "/tokens", label: "FV Tokens", icon: "live", requiresAuth: true },
    { href: "/explore", label: "Explore", icon: "search" },
    { href: "/messages", label: "Messages", icon: "message", requiresAuth: true },
    { href: profileHref, label: "Profile", icon: "user", requiresAuth: true },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col justify-between border-r border-red-900/40 bg-black px-3 py-4 md:flex">
        <div>
          <Link href="/" className="mb-4 block px-3 text-xl font-bold text-white">
            Fan<span className="text-[--accent]">Vault</span>
          </Link>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) =>
              item.requiresAuth && !isLoggedIn ? (
                <Link
                  key={item.label}
                  href="/login"
                  className="flex items-center gap-4 rounded-full px-3 py-3 text-lg text-stone-500 hover:bg-red-950/30"
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-4 rounded-full px-3 py-3 text-lg text-white hover:bg-red-950/30"
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {isCreator && (
            <Link
              href="/dashboard"
              className="mt-4 block rounded-full bg-[--accent] px-4 py-3 text-center font-semibold text-white hover:opacity-90"
            >
              Post
            </Link>
          )}

          <div className="mt-4 px-3">
            <CurrencySelector compact />
          </div>
        </div>

        <div>
          {isLoggedIn ? (
            <Link href="/dashboard" className="flex items-center gap-3 rounded-full px-3 py-2 hover:bg-red-950/30">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#1a0505]">
                {avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <span className="truncate text-sm font-medium text-white">{displayName ?? "Dashboard"}</span>
            </Link>
          ) : (
            <div className="flex flex-col gap-2 px-1">
              <Link href="/signup" className="rounded-full bg-[--accent] px-4 py-2 text-center text-sm font-medium text-white">
                Sign up
              </Link>
              <Link href="/login" className="rounded-full border border-red-900/60 px-4 py-2 text-center text-sm text-white">
                Log in
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-red-900/40 bg-black py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.requiresAuth && !isLoggedIn ? "/login" : item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-white"
            aria-label={item.label}
          >
            <NavIcon name={item.icon} />
          </Link>
        ))}
      </nav>
    </>
  );
}
