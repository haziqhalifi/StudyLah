"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AIAnalysisLoader } from "@/components/MvpCards";
import { buildDiagnosticResult, getStoredAnswers } from "@/lib/mvpData";

export default function AnalysisPage() {
  const router = useRouter();

  useEffect(() => {
    const name = sessionStorage.getItem("userName");
    const answers = getStoredAnswers();

    if (!name || Object.keys(answers).length === 0) {
      router.push("/diagnostic");
      return;
    }

    const timer = window.setTimeout(() => {
      const result = buildDiagnosticResult(name, answers);
      sessionStorage.setItem("diagnosticResult", JSON.stringify(result));
      router.push("/result");
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [router]);

  return <AIAnalysisLoader />;
}
