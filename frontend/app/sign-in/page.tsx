"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    router.push("/");
  }

  return (
    <section className="auth-shell page-enter" aria-label="Sign in">
      <div className="auth-hero">
        <p className="auth-kicker">Selamat kembali</p>
        <h1>Log Masuk ke StudyLah</h1>
        <p className="auth-subtext">Teruskan rentetan pembelajaran anda dan sambung dari tempat anda berhenti.</p>
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
            placeholder="Masukkan kata laluan anda"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="auth-submit" type="submit">
          Log Masuk
        </button>
      </form>

      <p className="auth-switch">
        Baru di StudyLah? <Link href="/sign-up">Daftar akaun</Link>
      </p>
    </section>
  );
}
