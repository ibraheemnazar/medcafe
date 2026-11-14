import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Github,
  History,
  LockKeyhole,
} from "lucide-react";
import {
  getRepositoryMenu,
  GITHUB_UPLOAD_URL,
  GITHUB_HISTORY_URL,
} from "@/lib/repository-menu";
import MenuPreview from "./preview";
import styles from "./panel.module.css";

export const metadata: Metadata = {
  title: "Menu admin | Med Cafe",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  const menu = getRepositoryMenu();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image src="/med.jpg" width={42} height={42} alt="" />
          <span>
            Med Cafe<small>MENU MANAGEMENT</small>
          </span>
        </Link>
        <Link href="/" className={styles.quietButton}>
          <ArrowLeft size={16} /> Back to cafe
        </Link>
      </header>
      <main className={styles.dashboard}>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>YOUR CAFE, UP TO DATE</span>
            <h1>Manage your menu</h1>
            <p>Check your PDF here, then upload it securely on GitHub.</p>
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
        <div className={styles.columns}>
          <section
            className={styles.uploadCard}
            aria-labelledby="replace-heading"
          >
            <div className={styles.iconBox}>
              <Github size={25} />
            </div>
            <h2 id="replace-heading">Update with your GitHub login</h2>
            <p className={styles.muted}>
              Only people with write access to the cafe repository can publish
              changes.
            </p>
            <ol className={styles.steps}>
              <li>
                <strong>
                  Name your file <code>menu.pdf</code>
                </strong>
                <span>
                  Use a PDF up to 20 MB with 1–100 pages. Check it in the
                  preview below.
                </span>
              </li>
              <li>
                <strong>Upload it on GitHub</strong>
                <span>
                  Sign in, choose your file, and select <b>Commit changes</b> to
                  the <code>main</code> branch. GitHub replaces the previous
                  file.
                </span>
              </li>
              <li>
                <strong>Wait for the site to update</strong>
                <span>
                  The update usually takes a few minutes. Until the build
                  succeeds, customers keep seeing the current menu.
                </span>
              </li>
            </ol>
            <a
              className={styles.primaryButton}
              href={GITHUB_UPLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                <Github size={18} /> Sign in &amp; replace PDF
              </span>
              <ArrowUpRight size={18} />
            </a>
            <p className={styles.hint}>
              <LockKeyhole size={12} /> GitHub handles sign-in and publishing
              access.
            </p>
          </section>
          <section
            className={styles.currentCard}
            aria-labelledby="current-heading"
          >
            <span className={styles.eyebrow}>CURRENTLY LIVE</span>
            <h2 id="current-heading">The menu customers see</h2>
            <div className={styles.fileRow}>
              <div className={styles.iconBox}>
                <FileText size={24} />
              </div>
              <div>
                <strong>{menu.menu.filename}</strong>
                <p>
                  {menu.menu.pages} pages ·{" "}
                  {(menu.menu.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <span className={styles.liveBadge}>Live</span>
            </div>
            <a
              className={styles.outlineButton}
              href={menu.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open current PDF <ArrowUpRight size={16} />
            </a>
            <div className={styles.currentNote}>
              <h3>Your QR code stays the same</h3>
              <p>
                After each successful update, anyone scanning the existing QR
                code gets the new menu.
              </p>
            </div>
            <a
              className={styles.historyLink}
              href={GITHUB_HISTORY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <History size={15} /> View previous menus on GitHub{" "}
              <ArrowUpRight size={14} />
            </a>
          </section>
        </div>
        <MenuPreview liveUrl={menu.url} />
      </main>
      <footer className={styles.footer}>
        Med Cafe <span>·</span> Menu management
      </footer>
    </div>
  );
}
