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
        <p className="auth-kicker">Welcome back</p>
        <h1>Sign In to StudyLah</h1>
        <p className="auth-subtext">Continue your learning streak and pick up where you left off.</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="auth-submit" type="submit">
          Sign In
        </button>
      </form>

      <p className="auth-switch">
        New to StudyLah? <Link href="/sign-up">Create account</Link>
      </p>
    </section>
  );
}
