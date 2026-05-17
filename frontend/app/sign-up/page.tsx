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
        <p className="auth-kicker">Get started</p>
        <h1>Create Your StudyLah Account</h1>
        <p className="auth-subtext">Set up your profile and start your adaptive SPM learning journey.</p>
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
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="auth-submit" type="submit">
          Create Account
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </section>
  );
}
