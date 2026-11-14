"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { FileCheck, Upload, X } from "lucide-react";
import { MAX_PDF_BYTES, MAX_PDF_PAGES } from "@/lib/menu-types";
import styles from "./panel.module.css";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => <p className="pdf-message">Loading preview…</p>,
});

export default function MenuPreview({ liveUrl }: { liveUrl: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function selectFile(file?: File) {
    if (!file) return;
    setError("");
    if (file.name !== "menu.pdf") {
      setError("Rename your file to menu.pdf before uploading it to GitHub.");
      return;
    }
    if (file.type && file.type !== "application/pdf") {
      setError("Choose a PDF file.");
      return;
    }
    if (!file.size || file.size > MAX_PDF_BYTES) {
      setError("Choose a PDF smaller than 20 MB.");
      return;
    }
    setChecked(false);
    setFilename(file.name);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <section className={styles.previewCard} aria-labelledby="preview-heading">
      <div className={styles.previewHeader}>
        <div>
          <span className={styles.eyebrow}>PREVIEW</span>
          <h2 id="preview-heading">
            {preview ? "Check before uploading" : "Your live menu"}
          </h2>
        </div>
        <label className={`${styles.outlineButton} ${styles.chooseButton}`}>
          <Upload size={16} /> Preview a new PDF
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Preview a new PDF"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
        </label>
      </div>
      <p className={styles.muted}>
        Previewing stays on your device. To publish, use the GitHub button above
        and upload the same file there.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {preview && (
        <div className={styles.previewStatus}>
          <p role="status">
            {checked ? (
              <>
                <FileCheck size={16} /> {filename} is ready to upload on GitHub.
              </>
            ) : (
              "Checking your PDF…"
            )}
          </p>
          <button
            className={styles.quietButton}
            onClick={() => {
              setPreview("");
              setFilename("");
              setChecked(false);
              setError("");
              if (input.current) input.current.value = "";
            }}
          >
            <X size={14} /> Show live menu
          </button>
        </div>
      )}
      <PdfViewer
        key={preview || liveUrl}
        url={preview || liveUrl}
        onReady={
          preview
            ? (pages) => {
                if (pages > MAX_PDF_PAGES) {
                  setChecked(false);
                  setError(
                    `Choose a PDF with no more than ${MAX_PDF_PAGES} pages.`,
                  );
                } else {
                  setChecked(true);
                }
              }
            : undefined
        }
        onInvalid={
          preview
            ? () => {
                setChecked(false);
                setError("Choose a valid PDF without password protection.");
              }
            : undefined
        }
      />
    </section>
  );
}
