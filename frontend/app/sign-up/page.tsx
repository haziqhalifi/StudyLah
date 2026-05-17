"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    router.push("/onboarding");
  }

  return (
    <section className="auth-shell page-enter" aria-label="Sign up">
      <div className="auth-hero">
        <p className="auth-kicker">Mulakan perjalanan</p>
        <h1>Cipta Akaun StudyLah Anda</h1>
        <p className="auth-subtext">Sediakan profil anda dan mulakan perjalanan pembelajaran SPM adaptif.</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>E-mel</span>
          <input
            type="email"
            placeholder="anda@contoh.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="auth-field">
          <span>Kata Laluan</span>
          <input
            type="password"
            placeholder="Cipta kata laluan"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="auth-submit" type="submit">
          Daftar Akaun
        </button>
      </form>

      <p className="auth-switch">
        Sudah ada akaun? <Link href="/sign-in">Log masuk</Link>
      </p>
    </section>
  );
}
