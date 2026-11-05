"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  FileText,
  LockKeyhole,
  LogOut,
  Upload,
  X,
} from "lucide-react";
import { MAX_PDF_BYTES, type PublicMenu } from "@/lib/menu-types";
import styles from "./panel.module.css";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => <p className="pdf-message">Loading preview…</p>,
});
type AdminData = { menu: PublicMenu; storage: "blob" | "local" };

async function readResponse(response: Response) {
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(result.error || "Something went wrong. Please try again."),
      { status: response.status },
    );
  return result;
}

export default function AdminPanel({
  configured,
  initialAuthenticated,
}: {
  configured: boolean;
  initialAuthenticated: boolean;
}) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [validPreview, setValidPreview] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function loadMenu() {
    try {
      setData(
        await readResponse(
          await fetch("/api/admin/menu", { cache: "no-store" }),
        ),
      );
    } catch (error) {
      const failure = error as Error & { status?: number };
      if (failure.status === 401) setAuthenticated(false);
      setError(failure.message);
    }
  }
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    fetch("/api/admin/menu", { cache: "no-store", signal: controller.signal })
      .then(readResponse)
      .then(setData)
      .catch((failure: Error & { status?: number }) => {
        if (failure.name === "AbortError") return;
        if (failure.status === 401) setAuthenticated(false);
        setError(failure.message);
      });
    return () => controller.abort();
  }, [authenticated]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await readResponse(
        await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }),
      );
      setPassword("");
      setAuthenticated(true);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await readResponse(await fetch("/api/admin/logout", { method: "POST" }));
      setAuthenticated(false);
      setData(null);
      setFile(null);
      setPreview("");
      setSuccess("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function selectFile(next?: File) {
    if (!next || busy) return;
    setError("");
    setSuccess("");
    if (
      !next.name.toLowerCase().endsWith(".pdf") ||
      (next.type && next.type !== "application/pdf")
    ) {
      setError("Choose a PDF file.");
      return;
    }
    if (!next.size || next.size > MAX_PDF_BYTES) {
      setError("Choose a PDF smaller than 20 MB.");
      return;
    }
    setValidPreview(false);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function publish() {
    if (!file || !data || !validPreview) return;
    setBusy(true);
    setError("");
    setSuccess("");
    setStage("Uploading PDF…");
    try {
      let body: FormData | string;
      let headers: HeadersInit | undefined;
      if (data.storage === "blob") {
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(
          `menus/uploads/${crypto.randomUUID()}.pdf`,
          file,
          {
            access: "private",
            handleUploadUrl: "/api/admin/upload",
            contentType: "application/pdf",
            onUploadProgress: ({ percentage }) =>
              setStage(`Uploading PDF… ${Math.round(percentage)}%`),
          },
        );
        body = JSON.stringify({ pathname: blob.pathname, filename: file.name });
        headers = { "Content-Type": "application/json" };
      } else {
        body = new FormData();
        body.append("file", file);
      }
      setStage("Checking and publishing…");
      const result = await readResponse(
        await fetch("/api/admin/menu", { method: "POST", headers, body }),
      );
      setData({ ...data, menu: result.menu });
      setFile(null);
      setPreview("");
      setValidPreview(false);
      if (input.current) input.current.value = "";
      setSuccess(
        "Your new menu is live. Customers scanning the QR code will see this PDF.",
      );
    } catch (error) {
      const failure = error as Error & { status?: number };
      if (failure.status === 401) setAuthenticated(false);
      setError(failure.message);
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  const current = data?.menu.kind === "pdf" ? data.menu : null;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image src="/med.jpg" width={42} height={42} alt="" />
          <span>
            Med Cafe<small>MENU MANAGEMENT</small>
          </span>
        </Link>
        {authenticated ? (
          <button
            className={styles.quietButton}
            onClick={logout}
            disabled={busy}
          >
            <LogOut size={16} /> Sign out
          </button>
        ) : (
          <Link href="/" className={styles.quietButton}>
            <ArrowLeft size={16} /> Back to cafe
          </Link>
        )}
      </header>
      {!authenticated ? (
        <main className={styles.loginWrap}>
          <div className={styles.loginIntro}>
            <span className={styles.eyebrow}>FOR THE TEAM</span>
            <h1>
              A fresh menu.
              <br />
              Same familiar place.
            </h1>
            <p>Keep your cafe menu up to date, one PDF at a time.</p>
          </div>
          <section className={styles.loginCard} aria-labelledby="login-title">
            <div className={styles.iconBox}>
              <LockKeyhole size={22} />
            </div>
            <h2 id="login-title">Welcome back</h2>
            <p className={styles.muted}>Sign in to manage your menu.</p>
            {!configured && (
              <p className={styles.notice} role="alert">
                Admin setup is not complete. The site owner needs to configure
                the login and file storage in Vercel.
              </p>
            )}
            <form onSubmit={login} className={styles.form}>
              <label>
                Username
                <input
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  maxLength={100}
                  disabled={busy || !configured}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  disabled={busy || !configured}
                />
              </label>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <button
                className={styles.primaryButton}
                disabled={busy || !configured}
              >
                {busy ? "Signing in…" : "Sign in"}
                <ArrowUpRight size={18} />
              </button>
            </form>
            <p className={styles.secureNote}>
              <LockKeyhole size={13} /> Private access for your cafe team
            </p>
          </section>
        </main>
      ) : (
        <main className={styles.dashboard}>
          <div className={styles.heading}>
            <div>
              <span className={styles.eyebrow}>YOUR CAFE, UP TO DATE</span>
              <h1>Manage your menu</h1>
              <p>Upload a PDF. Check the preview. Publish when it’s ready.</p>
            </div>
            <Link
              className={styles.outlineButton}
              href="/"
              target="_blank"
              rel="noopener noreferrer"
            >
              View cafe page <ArrowUpRight size={16} />
            </Link>
          </div>
          {error && (
            <div className={styles.error} role="alert">
              {error}
              {!data && (
                <button
                  onClick={() => {
                    setError("");
                    void loadMenu();
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          )}
          {success && (
            <div className={styles.success} role="status">
              <Check size={19} />
              <p>{success}</p>
            </div>
          )}
          <div className={styles.columns}>
            <section
              className={styles.uploadCard}
              aria-labelledby="replace-heading"
            >
              <span className={styles.sectionNumber}>01 / UPDATE</span>
              <h2 id="replace-heading">Replace the menu</h2>
              <p className={styles.muted}>
                Your current menu stays live until you publish a new one.
              </p>
              <label
                className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  selectFile(event.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={input}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={busy || !data}
                  onChange={(event) => selectFile(event.target.files?.[0])}
                  aria-label="Choose menu PDF"
                />
                <Upload size={27} strokeWidth={1.5} />
                <strong>{file ? file.name : "Choose a PDF to upload"}</strong>
                <span>
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to preview`
                    : "or drag and drop it here"}
                </span>
                <small>PDF only · Up to 20 MB · Up to 100 pages</small>
              </label>
              {file && (
                <button
                  disabled={busy}
                  className={styles.removeButton}
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                    setValidPreview(false);
                    if (input.current) input.current.value = "";
                  }}
                >
                  <X size={14} /> Remove selection
                </button>
              )}
              <button
                className={styles.primaryButton}
                onClick={publish}
                disabled={busy || !file || !validPreview || !data}
              >
                {busy ? stage : "Publish new menu"}
                {!busy && <ArrowUpRight size={18} />}
              </button>
              <p className={styles.hint}>
                Your existing QR code continues to work.
              </p>
            </section>
            <section
              className={styles.currentCard}
              aria-labelledby="current-heading"
            >
              <span className={styles.sectionNumber}>02 / CURRENTLY LIVE</span>
              <h2 id="current-heading">The menu customers see</h2>
              {!data ? (
                <p className={styles.muted} role="status">
                  Loading current menu…
                </p>
              ) : current ? (
                <>
                  <div className={styles.fileRow}>
                    <div className={styles.iconBox}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <strong>{current.menu.filename}</strong>
                      <p>
                        {current.menu.pages}{" "}
                        {current.menu.pages === 1 ? "page" : "pages"} ·{" "}
                        {(current.menu.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <span className={styles.liveBadge}>Live</span>
                  </div>
                  <dl className={styles.details}>
                    <dt>Last updated</dt>
                    <dd>
                      {new Date(current.menu.updatedAt).toLocaleString(
                        undefined,
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </dd>
                  </dl>
                  <a
                    className={styles.outlineButton}
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open current PDF <ArrowUpRight size={16} />
                  </a>
                </>
              ) : (
                <>
                  <div className={styles.fileRow}>
                    <div className={styles.iconBox}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <strong>Original cafe menu</strong>
                      <p>The existing image menu is live.</p>
                    </div>
                    <span className={styles.liveBadge}>Live</span>
                  </div>
                  <p className={styles.muted}>
                    Publish your first PDF to replace the image menu. No QR code
                    changes are needed.
                  </p>
                </>
              )}
            </section>
          </div>
          <section
            className={styles.previewCard}
            aria-labelledby="preview-heading"
          >
            <div className={styles.previewHeader}>
              <div>
                <span className={styles.sectionNumber}>PREVIEW</span>
                <h2 id="preview-heading">
                  {file ? "Check before publishing" : "Your live menu"}
                </h2>
              </div>
              {file && <span className={styles.draftBadge}>Not published</span>}
            </div>
            {preview ? (
              <PdfViewer
                key={preview}
                url={preview}
                onReady={() => setValidPreview(true)}
                onInvalid={() => {
                  setValidPreview(false);
                  setError(
                    "This PDF cannot be previewed. Choose a valid PDF without password protection.",
                  );
                }}
              />
            ) : current ? (
              <PdfViewer key={current.url} url={current.url} />
            ) : (
              <div className={styles.emptyPreview}>
                <FileText size={35} strokeWidth={1} />
                <p>Choose a PDF to see it here.</p>
                <span>You can review every page before publishing.</span>
              </div>
            )}
          </section>
        </main>
      )}
      <footer className={styles.footer}>
        Med Cafe <span>·</span> Menu management
      </footer>
    </div>
  );
}
