import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="px-4 py-12">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
