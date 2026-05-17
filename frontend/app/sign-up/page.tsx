"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

function TypewriterText({ text, speed = 28 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!text.length) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <>{displayed}</>;
}

export default function SignUpPage() {
  const router = useRouter();

  return (
    <div className="ob-page">
      <div className="ob-welcome-layout">
        <div className="ob-dialogue ob-dialogue--above">
          <TypewriterText text='Selamat Datang ke StudyLah. Mulakan langkah menggapai "A" anda hari ini!' />
        </div>
        <div className="ob-mascot-wrapper">
          <Image
            src="/assets/mascot.webp"
            alt="Mascot Skorrel"
            width={180}
            height={180}
            className="ob-mascot-center"
            style={{ width: "180px", height: "180px" }}
            priority
          />
        </div>
      </div>

      <div className="ob-sticky-cta">
        <button
          type="button"
          className="btn-primary"
          onClick={() => router.push("/onboarding")}
        >
          Daftar Akaun
        </button>
      </div>
    </div>
  );
}
