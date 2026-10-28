import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import {
  AUTH_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/server/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    await verifySessionToken(token);
  } catch {
    redirect("/login?reason=session");
  }

  return <AppShell>{children}</AppShell>;
}
