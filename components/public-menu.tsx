"use client";

import { useEffect, useState } from "react";
import type { PublicMenu } from "@/lib/menu-types";
import MenuPages from "./menu-pages";

export default function PublicMenuViewer() {
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch("/api/menu", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setMenu(await response.json());
      })
      .catch((error) => {
        if (error.name !== "AbortError" || !cancelled) setError(true);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  if (error)
    return (
      <div className="pdf-message" role="alert">
        <p>The menu could not load.</p>
        <button
          className="underline mt-3"
          onClick={() => {
            setError(false);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  if (!menu)
    return (
      <p className="pdf-message" role="status">
        Loading the latest menu…
      </p>
    );
  return <MenuPages key={menu.menu.id} menu={menu} />;
}
