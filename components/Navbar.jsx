"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close the mobile menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setOpen(false);
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
              className={cn("hidden text-sm transition-colors md:inline", t.muted)}
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

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full md:hidden",
            t.brand,
          )}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full w-full border-t border-white/10 px-6 py-4 backdrop-blur-md md:hidden",
            tone === "solid" ? "bg-sand/95" : "bg-plum/95",
          )}
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn("rounded-lg px-2 py-3 text-base", tone === "solid" ? "text-plum" : "text-white")}
              >
                {link.label}
              </Link>
            ))}
            {!loading && user && (
              <>
                <Link
                  href="/bookings"
                  onClick={() => setOpen(false)}
                  className={cn("rounded-lg px-2 py-3 text-base", tone === "solid" ? "text-plum" : "text-white")}
                >
                  My tickets
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-2 py-3 text-base text-mango"
                  >
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn("rounded-lg px-2 py-3 text-left text-base", tone === "solid" ? "text-plum/70" : "text-white/70")}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
