# Med Cafe

The QR code points to **https://medcafe-one.vercel.app/**. Menu management is at **https://medcafe-one.vercel.app/admin**.

## Update the menu using GitHub

No Vercel dashboard access, API key, storage account, or separate cafe password is required. GitHub is the publishing login. The existing Vercel GitHub integration deploys updates from `main`.

1. Prepare a PDF named **menu.pdf**, up to **20 MB**, with **1–100 pages**, without password protection.
2. Open `/admin` to preview the new PDF locally on your device. This does not upload or publish anything.
3. Select **Sign in & replace PDF**, which opens [GitHub's upload page for content/](https://github.com/ibraheemnazar/medcafe/upload/main/content). Sign in to GitHub with repository write access.
4. Upload your `menu.pdf` and **Commit changes** to **main**. It replaces `content/menu.pdf`. Do not upload to the repository root or rename the file.
5. Wait for the deployment to succeed (usually a few minutes), then open the original QR link and select **View Our Menu**. The QR code stays unchanged.

If GitHub requires a pull request, merge the PDF change into `main` to publish. A wrong filename, invalid PDF, or failed build stops the deployment and leaves the previous website live. Fix the PDF and commit again. Previewing a PDF on `/admin` alone never publishes it.

## Access and history

- Only GitHub collaborators with write access can change the repository. Viewing `/admin` does not grant upload access.
- Repository access is distinct from Vercel access. Ibraheem can manage collaborators through the repository's **Settings → Collaborators**; the `bariqnet` account already has write access.
- The repository is public, so PDFs and historical revisions are public. Upload only the public cafe menu.
- [Previous versions are in Git history](https://github.com/ibraheemnazar/medcafe/commits/main/content/menu.pdf). Restore an older `content/menu.pdf` by committing that version back to `main`.
- The initial PDF contains exactly the nine menu images used by the previous cafe page; the unused tenth image is not included.

## How it works

`content/menu.pdf` is the single source of truth. At install/build time, `scripts/prepare-menu.mjs` parses it and enforces file size, page count, and exact filename. It writes a generated manifest and an identical static PDF with a SHA-256 filename. Different PDFs receive different URLs so browsers cannot serve a previous PDF from cache. The API always returns the menu included in the current deployment. Validation requires no environment variables or network storage.

This update replaces the earlier draft's separate password/Blob implementation. The previous generated cafe credentials are not used; no credentials belong in the repository.

## Local development and checks

Use Node.js 22.13+:

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

If you replace `content/menu.pdf` while the development server is running, restart it or run `npm run prepare:menu` to regenerate the PDF asset and manifest. Generated files are ignored by Git; commit the source PDF.
