# Med Cafe

Public cafe and printed QR destination: https://medcafe-one.vercel.app/

Admin entry point: https://medcafe-one.vercel.app/admin

## Cafe login and menu uploads

The admin link redirects to the dedicated cafe service at https://medcafe.srv2124063.hstgr.cloud/admin. Sign in with the cafe username/password, choose a PDF, optionally open its preview, and press **Publish new menu**. Customers using the original QR code get the latest menu immediately after a successful upload. A GitHub account is not required.

PDFs can be up to 20 MB with 1–100 pages and cannot be password protected. Files are checked on the server before publication. Invalid uploads leave the existing menu live. Original PDFs are retained, and uploads are stored on a persistent host volume.

To update the login, expand **Change username & password**, enter the current password and new credentials, and save. This invalidates all old sessions. The password must be at least 12 characters.

The generated credentials are supplied privately outside the repository. Never commit them, a password hash, session data, or a database backup to GitHub.

## Architecture

- Next.js on the existing Vercel deployment keeps the cafe page and QR address.
- `/api/menu` reads fresh metadata from the cafe service. A brief service failure returns an error rather than silently displaying an old menu.
- PDF bytes are served directly from the dedicated service over HTTPS with content-hashed URLs and CORS for the customer PDF viewer.
- `/admin` redirects to the HTTPS cafe service, which owns login and upload handling.
- `admin-service/` runs Flask/Gunicorn in an isolated, non-root container on the existing Hostinger VPS. Credentials, SQLite sessions/rate counters/menu metadata and uploaded PDFs are in `/opt/medcafe-admin/data`, outside the code checkout.
- Server sessions are opaque random tokens stored hashed in SQLite, expire after eight hours, and use Secure/HttpOnly/SameSite=Strict cookies. Mutations check both Origin and a per-session CSRF token. Login attempts are limited to ten per source IP per 15-minute window.
- Daily local backups copy the SQLite database consistently and archive credentials and uploaded files. Fourteen snapshots are retained in `/opt/medcafe-admin/backups`. These are local recovery copies; copy them off-host for disaster recovery.
- The previously committed `content/menu.pdf` is kept as the original source snapshot. Runtime uploads are authoritative and do not change the Git repository. The previous GitHub-only upload page and old generated credentials are superseded.

## Local checks

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

For the service:

```sh
python3 -m venv .venv
.venv/bin/pip install -r admin-service/requirements.txt
.venv/bin/python -m unittest discover -s admin-service/tests -v
```

The service refuses to start without an existing credentials file. To bootstrap a fresh instance, run `admin-service/bootstrap.py /persistent/path/credentials.json medcafe` once, save its printed password securely, and point `DATA_DIR` at that directory. The script refuses to overwrite an account. Never run initialization against an existing production directory.

Deploy with the service's Docker Compose file. The directory must be owned by UID/GID 10001, the existing `coolify` Docker network must exist, and HTTPS is handled by the existing Traefik proxy. No Vercel secrets or configuration changes are needed.
