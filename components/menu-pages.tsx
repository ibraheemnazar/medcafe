"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { PublicMenu } from "@/lib/menu-types";

export default function MenuPages({ menu }: { menu: PublicMenu }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const page = menu.pageImages[index];

  function changePage(next: number) {
    setLoaded(false);
    setFailed(false);
    setAttempt(0);
    setIndex(next);
    // Keep navigation visible after scrolling through a tall menu page.
    container.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  return (
    <div className="menu-page-viewer" ref={container}>
      <nav className="menu-page-controls" aria-label="Menu pages">
        <button
          type="button"
          aria-label="Previous page"
          disabled={index === 0}
          onClick={() => changePage(index - 1)}
        >
          <ChevronLeft size={20} />
        </button>
        <span aria-live="polite">
          Page {index + 1} of {menu.pageImages.length}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={index === menu.pageImages.length - 1}
          onClick={() => changePage(index + 1)}
        >
          <ChevronRight size={20} />
        </button>
      </nav>
      {!loaded && !failed && (
        <p className="menu-image-status" role="status">
          Loading menu page…
        </p>
      )}
      {failed ? (
        <div className="pdf-message" role="alert">
          <p>This page could not load.</p>
          <button
            type="button"
            className="menu-retry"
            onClick={() => {
              setFailed(false);
              setLoaded(false);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        // A single bounded image replaces browser-side decoding of the entire PDF.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${index}-${attempt}`}
          src={page.url}
          width={page.width}
          height={page.height}
          alt={`Med Cafe menu, page ${index + 1} of ${menu.pageImages.length}`}
          className="menu-page-image"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      <a
        className="menu-download"
        href={menu.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Download size={15} /> Open original PDF (
        {(menu.menu.size / 1024 / 1024).toFixed(1)} MB)
      </a>
    </div>
  );
}
