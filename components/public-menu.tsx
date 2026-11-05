"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { PublicMenu } from "@/lib/menu-types";

const PdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => <p className="pdf-message">Loading PDF viewer…</p>,
});

export default function PublicMenuViewer() {
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/menu", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setMenu(await response.json());
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
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
  if (menu.kind === "pdf") return <PdfViewer key={menu.url} url={menu.url} />;
  return (
    <div className="flex flex-col gap-2 sm:gap-4 items-center">
      {menu.images.map((src, i) => (
        <div
          key={src}
          className="w-full max-w-2xl bg-white p-1 sm:p-2 rounded-lg shadow-md"
        >
          {/* Existing image menu remains available until the first PDF is published. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Menu page ${i + 1}`}
            className="w-full h-auto rounded"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
