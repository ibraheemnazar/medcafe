# Replace the cafe menu

1. Rename the new PDF to **menu.pdf** before uploading. It must be an unencrypted PDF, no larger than 20 MB, with 1–100 pages.
2. [Upload the replacement here](https://github.com/ibraheemnazar/medcafe/upload/main/content). Sign in with a GitHub account that has write access.
3. Upload `menu.pdf`, then **Commit changes** to `main`. This replaces `content/menu.pdf`; do not delete the old file first.
4. Wait for the Vercel deployment to succeed, then check [the cafe menu](https://medcafe-one.vercel.app/). The QR code stays the same.

If GitHub requires a pull request, create it and merge it into `main` to publish. The site validates the PDF during the build; an invalid PDF fails the build and the existing deployment remains live. Fix the file and commit again.

Only upload public cafe menu content: this repository and its file history are public. Previous menu PDFs are kept in Git history. Do not upload passwords or customer information.

No Vercel dashboard access, API token, separate cafe password, or storage configuration is needed. Menu changes become live after a successful deployment, not immediately after the upload.
