import { Suspense } from "react";
import { LoginForm } from "./login-form";

const FEATURES = [
  { icon: "📔", text: "Detailed grow journals with metrics" },
  { icon: "🤝", text: "Connect with experienced growers" },
  { icon: "🏆", text: "Build your reputation and grow" },
] as const;

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — form */}
      <div className="md:w-1/2 flex flex-col justify-center max-w-md mx-auto">
        <Suspense fallback={<div className="px-4 py-12">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Right panel — brand (md+ only) */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-center items-center bg-gradient-to-br from-[var(--gn-surface-raised)] to-[var(--gn-surface-elevated)] p-12">
        <div className="text-center max-w-xs">
          <div className="text-6xl mb-6">🌿</div>
          <h2 className="text-2xl font-bold text-[var(--gn-text)] mb-3">
            Grow with your community
          </h2>
          <p className="text-[var(--gn-text-muted)] text-sm mb-8">
            Track your grows, share your knowledge, and connect with growers
            worldwide.
          </p>
          <div className="space-y-3 text-left">
            {FEATURES.map((f) => (
              <div key={f.icon} className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm text-[var(--gn-text-muted)]">
                  {f.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
