import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MENU_SERVICE_ORIGIN } from "@/lib/remote-menu";

export const metadata: Metadata = {
  title: "Menu admin | Med Cafe",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  redirect(`${MENU_SERVICE_ORIGIN}/admin`);
}
