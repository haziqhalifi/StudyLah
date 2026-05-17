"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <main className="signup-showcase">
      <section className="signup-card" aria-label="Sign up welcome">
        <div className="signup-mascot-row">
          <div className="signup-bubble" role="note" aria-label="Welcome message">
            <p>
              <span className="signup-typing-text">Hai saya Skorrel. Selamat Datang ke StudyLah</span>
            </p>
            <span className="signup-bubble-tail" aria-hidden="true" />
          </div>
          <Image src="/assets/mascot.webp" alt="Mascot Skorrel" width={190} height={190} priority />
        </div>

        <button className="signup-cta" type="button" onClick={() => router.push("/onboarding")}>
          Daftar Akaun
        </button>
      </section>
    </main>
  );
}
