"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
const options = { disableAutoFetch: true };

export default function PdfViewer({
  url,
  onReady,
  onInvalid,
}: {
  url: string;
  onReady?: () => void;
  onInvalid?: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(200, Math.min(900, entry.contentRect.width))),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="pdf-viewer">
      <Document
        file={url}
        options={options}
        onLoadSuccess={({ numPages }) => {
          setPages(numPages);
          setPage(1);
          setError(false);
          onReady?.();
        }}
        onLoadError={() => {
          setError(true);
          onInvalid?.();
        }}
        onPassword={() => {
          setError(true);
          onInvalid?.();
        }}
        loading={
          <p className="pdf-message" role="status">
            Loading PDF…
          </p>
        }
        error={
          <p className="pdf-message" role="alert">
            This PDF could not be displayed. Please open the file below.
          </p>
        }
      >
        {!error && (
          <Page
            pageNumber={page}
            width={width}
            devicePixelRatio={Math.min(
              typeof window === "undefined" ? 1 : window.devicePixelRatio,
              2,
            )}
            renderAnnotationLayer={false}
            loading={
              <p className="pdf-message" role="status">
                Loading page…
              </p>
            }
          />
        )}
      </Document>
      <div className="pdf-controls">
        {pages > 0 && !error && (
          <div className="pdf-pagination">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span aria-live="polite">
              {page} / {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open PDF <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
