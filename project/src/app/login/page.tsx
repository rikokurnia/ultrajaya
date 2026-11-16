import { redirect } from "next/navigation";
import Image from "next/image";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { CalendarDays } from "lucide-react";
import { formatDate } from "@/shared/format";
export const metadata = { title: "Sign in" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <main id="main-content" className="login-page">
      <section className="login-branding" aria-label="About Ultrajaya">
        <Brand light />
        <div className="hero-copy">
          <h1>
            Connected procurement.
            <br />
            Confident decisions.
          </h1>
          <p>
            From material requests to payments,
            <br />
            one clear view of every operation.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <Image
            src="/login-reference.png"
            alt=""
            width={1600}
            height={1000}
            priority
            unoptimized
          />
        </div>
        <div className="hero-stages" aria-label="Connected workflow">
          {["Suppliers", "Raw materials", "Receiving", "Finance"].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="branding-footer">
          <span>
            <CalendarDays size={20} aria-hidden />
            {formatDate(new Date())}
          </span>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-card">
          <Brand compact />
          <h2>Welcome back</h2>
          <p className="login-subtitle">Sign in to your Ultrajaya workspace.</p>
          <LoginForm next={next} />
        </div>
        <footer>Ultrajaya ERP</footer>
      </section>
    </main>
  );
}
