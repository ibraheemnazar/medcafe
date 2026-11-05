import type { Metadata } from "next";
import { cookies } from "next/headers";
import { authConfig, sessionCookieName, verifySession } from "@/lib/auth";
import { storageMode } from "@/lib/storage";
import AdminPanel from "./panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu admin | Med Cafe", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const jar = await cookies();
  let configured = true;
  try { authConfig(); storageMode(); } catch { configured = false; }
  return <AdminPanel configured={configured} initialAuthenticated={configured && verifySession(jar.get(sessionCookieName())?.value)} />;
}
