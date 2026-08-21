import { redirect } from "next/navigation";

import { AdminCard } from "@/components/admin/AdminCard";
import { LoginForm } from "@/components/admin/LoginForm";
import { getCurrentAdmin } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect("/admin");
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--brand-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--on-brand)",
              fontWeight: 700,
              fontSize: "var(--text-4)",
              boxShadow: "var(--shadow-primary)",
            }}
          >
            КМ
          </div>
          <h1 style={{ fontSize: "var(--text-7)", color: "var(--text-primary)", margin: 0, textAlign: "center" }}>
            Контроль металла
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-3)", margin: 0, textAlign: "center" }}>
            Вход в администрирование
          </p>
        </div>
        <AdminCard>
          <LoginForm />
        </AdminCard>
      </div>
    </main>
  );
}
