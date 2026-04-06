"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REDIRECT_SECONDS = 10;

export default function AuthCompletePage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const redirected = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session);
    });
  }, []);

  useEffect(() => {
    if (seconds > 0) return;
    if (redirected.current) return;
    redirected.current = true;
    router.push("/");
    router.refresh();
  }, [seconds, router]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        Verification complete
      </h1>
      <p className="mt-3 text-[var(--gn-text-muted)]">
        {signedIn === true
          ? "Your email is confirmed and you&apos;re signed in. "
          : null}
        Taking you home in{" "}
        <span className="font-semibold tabular-nums text-[var(--gn-text)]">
          {seconds}
        </span>
        …
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm font-semibold text-[#ff4500] hover:underline"
      >
        Go home now
      </Link>
    </main>
  );
}
