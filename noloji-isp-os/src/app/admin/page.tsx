"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/landlords");
  }, [router]);

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
    </div>
  );
}
