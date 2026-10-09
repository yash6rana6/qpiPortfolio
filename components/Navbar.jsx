"use client";

import Link from "next/link";
import Image from "next/image"; // <-- Next.js Image import karein
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider.jsx";
import { NAV_LINKS } from "../lib/siteConfig.js";
import { cn } from "../lib/utils.js";

// overlay: floats over the dark hero · solid: light bar for sand pages (About, Events)
const TONES = {
  overlay: {
    bar: "bg-black/15",
    brand: "text-white",
    link: "text-white/70 hover:text-white",
    muted: "text-white/50 hover:text-white",
  },
  solid: {
    bar: "bg-sand/85 shadow-sm",
    brand: "text-plum",
    link: "text-plum/70 hover:text-plum",
    muted: "text-plum/50 hover:text-plum",
  },
};

export default function Navbar({ tone = "overlay" }) {
  const t = TONES[tone] || TONES.overlay;
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "fixed top-0 z-50 flex w-full items-center justify-between px-6 py-5 backdrop-blur-md md:px-16",
        t.bar,
      )}
    >
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.svg"
          alt="QPIE Logo"
          width={100}
          height={32}
          priority
          className="h-8 w-auto drop-shadow-[1px_1px_0px_rgba(255,255,255,0.9),_-1px_-1px_0px_rgba(0,0,0,0.6)]"
        />
      </Link>
      <nav className="flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn("hidden text-sm transition-colors md:inline", t.link)}
          >
            {link.label}
          </Link>
        ))}

        {!loading && user && (
          <>
            <Link
              href="/bookings"
              className={cn(
                "hidden text-sm transition-colors md:inline",
                t.link,
              )}
            >
              My tickets
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="hidden text-sm text-mango transition-colors hover:text-white md:inline"
              >
                Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className={cn("text-sm transition-colors", t.muted)}
            >
              Sign out
            </button>
          </>
        )}

        {!loading && !user && (
          <Link
            href="/login"
            className={cn("text-sm transition-colors", t.link)}
          >
            Sign in
          </Link>
        )}

        <Link
          href="/events"
          className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-white shadow-glow-coral transition-transform duration-300 ease-spring hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Book My Show
        </Link>
      </nav>
    </header>
  );
}
