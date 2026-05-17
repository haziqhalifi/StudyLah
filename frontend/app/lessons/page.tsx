"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LessonsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learning");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <p className="text-gray-500">Mengalihkan ke Bahan Pembelajaran…</p>
    </div>
  );
}
