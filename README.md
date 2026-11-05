# Med Cafe

The cafe page at `https://medcafe-one.vercel.app/` and its password-protected menu admin at `/admin`.

## What the admin does

Sign in with a username and password, select a PDF (up to 20 MB and 100 pages), preview it, and press **Publish new menu**. Customers opening the existing QR code see the published PDF. The original image menu remains available until the first PDF is published. Invalid or failed uploads do not replace the live menu.

## Activate on Vercel

Use the existing **medcafe** project in **ibraheemnazars-projects** that serves **medcafe-one.vercel.app**. This repository has multiple Vercel deployments, so check the domain before changing settings.

1. Generate credentials locally with Node.js 22 or newer:

   ```sh
   npm ci
   npm run admin:setup
   ```

   Save the printed username and password in your password manager. The command writes `.env.local`, which is ignored by Git, with the password hash and a random session secret. It refuses to overwrite an existing file. For a different username or output file:

   ```sh
   npm run admin:setup -- --username cafe-admin --output .env.admin
   ```

2. In the existing Vercel project, open **Storage**, create a **private Vercel Blob** store, and connect it to the project. Enable it for **Production**. This provides `BLOB_READ_WRITE_TOKEN` automatically. Use a separate store if you also want Preview uploads; do not connect preview deployments to production menu storage.
3. In **Settings → Environment Variables**, add these three values for **Production**:

   | Name | Value |
   | --- | --- |
   | `ADMIN_USERNAME` | The generated username |
   | `ADMIN_PASSWORD_HASH` | The generated `scrypt$…$…` hash |
   | `SESSION_SECRET` | The generated random session secret |

   When copying the hash from `.env.local` into an individual Vercel text field, remove the backslashes before `$`. Backslashes are only needed in local `.env` files, where Next.js expands dollar signs. Never add `NEXT_PUBLIC_` to these variables. No GitHub token is required.
4. Merge the menu-admin pull request into `main` and let Vercel deploy, or redeploy after adding variables if it was already merged.
5. Open `https://medcafe-one.vercel.app/admin`, sign in, and publish the menu PDF. Verify **View Our Menu** from the cafe page. The printed QR code stays the same.

Vercel Blob usage is billed under the owner's existing Vercel plan. See [Blob storage setup](https://vercel.com/docs/vercel-blob/using-blob-sdk) and [private storage](https://vercel.com/docs/vercel-blob/private-storage).

## Local development

```sh
npm ci
npm run admin:setup
npm run dev
```

Visit `http://localhost:3000/admin`. Without a Blob token, local development stores files in `.data/`, excluded from Git. Restarting the development server preserves them. Never use this local disk mode on Vercel. A self-hosted, single-server production installation can set `LOCAL_STORAGE_DIR` to a persistent directory; provision backups and HTTPS there.

## Security and storage behavior

- Credentials are checked on the server using a salted scrypt hash. There is no default password.
- Sessions are signed, expire after eight hours, and use HttpOnly, SameSite=Strict cookies; production cookies are Secure and have the `__Host-` prefix. Changing the password hash or session secret invalidates existing sessions.
- Every admin API checks authorization. Mutating browser requests require a matching Origin.
- Sign-in attempts are stored durably and limited to ten per source IP per 15-minute window. Source IPs are HMAC-hashed before storage. Configure a Vercel Firewall rule for `/api/admin/login` if additional edge abuse protection is needed.
- Uploads go directly to private Blob storage with short-lived, size-limited, PDF-only upload tokens. The server parses the file and checks page count before publishing it.
- PDFs and version records use unique paths. Only the current-menu pointer is replaced. Uncached pointer reads make new publications visible immediately. Historical published versions remain available at their original version URL.
- Private Blob credentials never reach the browser. Only published PDFs are served through `/api/menu/pdf`; unpublished uploads and security records are private.
- Keep the original image files: they are the safe initial menu. A storage failure after activation returns an error rather than silently showing an out-of-date menu.
- Old revisions, unpublished uploads, and expired sign-in records are retained. The owner may remove old `security/login/` folders after the 15-minute window, and unneeded uploads/version records through the Blob dashboard. Preserve `menus/current.json`, the version it references, and that version's PDF. No automatic deletion is performed.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover password verification, session tampering/expiry/credential rotation, cross-origin rejection, durable rate limits, Vercel storage configuration, PDF validation, and preservation of the live menu and prior versions.
