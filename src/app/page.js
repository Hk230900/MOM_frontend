"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login");
    } else {
      const role = api.getUserRole();
      if (role === "Admin") {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard/employee");
      }
    }
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-slate-400 animate-pulse font-medium">Redirecting to your workspace...</p>
      </div>
    </div>
  );
}
