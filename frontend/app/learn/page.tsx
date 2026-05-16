"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { buildDiagnosticResult, getStoredAnswers } from "@/lib/mvpData";

export default function LearnIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const rawResult = sessionStorage.getItem("diagnosticResult");
    if (rawResult) {
      const result = JSON.parse(rawResult) as ReturnType<typeof buildDiagnosticResult>;
      router.replace(`/learn/${result.recommendedTopics[0].id}`);
      return;
    }

    const name = sessionStorage.getItem("userName");
    const answers = getStoredAnswers();
    if (name && Object.keys(answers).length > 0) {
      const result = buildDiagnosticResult(name, answers);
      sessionStorage.setItem("diagnosticResult", JSON.stringify(result));
      router.replace(`/learn/${result.recommendedTopics[0].id}`);
      return;
    }

    router.replace("/");
  }, [router]);

  return <p className="mutedText">Preparing your learning topic...</p>;
}
