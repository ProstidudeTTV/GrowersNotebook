import { Suspense } from "react";
import { LoginForm } from "./login-form";

const FEATURES = [
  { text: "Track every grow week by week" },
  { text: "Join communities of real growers" },
  { text: "Build your strain & breeder knowledge" },
] as const;

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel — form */}
      <div className="flex flex-1 flex-col justify-center lg:max-w-[50%]">
        <div className="mx-auto w-full max-w-md px-6 py-12">
          {/* Brand mark */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gn-accent)] font-black text-lg text-black">
              GN
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--gn-text)]">
                Growers Notebook
              </p>
              <p className="text-[10px] uppercase tracking-widest text-[var(--gn-text-muted)]">
                Grow · Share · Thrive
              </p>
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[var(--gn-text)]">
            Welcome back, grower
          </h1>
          <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
            Sign in to your account to continue.
          </p>

          <div className="mt-8">
            <Suspense fallback={<div className="py-4 text-sm text-[var(--gn-text-muted)]">Loading…</div>}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-8 text-center text-xs text-[var(--gn-text-muted)]">
            10,000+ growers trust Growers Notebook
          </p>
        </div>
      </div>

      {/* Right panel — brand banner (lg+) */}
      <div className="hidden lg:flex lg:max-w-[50%] lg:flex-1 lg:flex-col lg:items-center lg:justify-center bg-gradient-to-br from-emerald-950 to-green-900 p-12 relative overflow-hidden">
        {/* Decorative leaf */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
          <span className="text-[18rem] opacity-[0.06]">🌿</span>
        </div>

        <div className="relative z-10 max-w-xs text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gn-accent)]/20 text-4xl">
            🌱
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Grow with your community
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Track your grows, share your knowledge, and connect with growers worldwide.
          </p>
          <ul className="mt-8 space-y-3 text-left">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--gn-accent)]/30 text-[10px] font-black text-[var(--gn-accent)]">
                  ✓
                </span>
                <span className="text-sm text-white/80">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
