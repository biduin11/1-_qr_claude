import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { getCurrentAdmin } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect("/admin");
  }

  return (
    <main style={{ minHeight: "100vh", maxWidth: 360, margin: "0 auto", padding: "4rem 1rem" }}>
      {/* 1.5rem (--text-7) — совпадает с h1 остальных страниц админки
          (было изолированное 1.4rem только тут, аудит «Типографика»). */}
      <h1 style={{ fontSize: "var(--text-7)", color: "var(--text-primary)", textAlign: "center" }}>Вход в администрирование</h1>
      <LoginForm />
    </main>
  );
}
