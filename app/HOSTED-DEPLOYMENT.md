# Hosted deployment setup

The hosted app uses Convex Auth for invitation-only password sign-in, Convex for authenticated data/functions and private file storage, and a static frontend host such as Vercel or Netlify. Convex Auth is currently beta. Keep development and production deployments separate.

## 1. Convex Auth

From the `app` directory, install dependencies and create or select a Convex project:

```powershell
pnpm install
pnpm convex:dev
```

The hosted client uses Convex Auth directly; no Clerk or other identity-provider account is needed. Set these values in the Convex development deployment through the CLI or dashboard:

- `APP_OWNER_EMAIL`: your sign-in email. This email can create the initial account with the owner setup code and is the only account allowed to invite collaborators.
- `APP_OWNER_SETUP_CODE`: a unique random code used only for the initial owner account creation. Keep it private and rotate it after the owner account has been created.
- `APP_ORIGIN`: `http://127.0.0.1:4174` for local hosted-app development.
- `OLLAMA_API_KEY`: the Ollama Cloud secret used by the hosted generation actions.
- `APP_WORKER_URL`: the HTTPS origin of the private application worker.
- `APP_WORKER_SECRET`: a random shared secret used to authenticate Convex-to-worker requests.

Convex Auth also needs its deployment signing keys. After `pnpm convex:dev` has selected the development deployment, run `pnpm exec auth --web-server-url http://127.0.0.1:4174` and follow its prompts to configure `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL`. Keep the existing invitation-aware `convex/auth.ts` and the custom routes in `convex/http.ts` when the setup command identifies existing files. Set `APP_OWNER_EMAIL` before the first owner sign-up.

The first `pnpm convex:dev` run may stop while the deployment is missing the environment values listed above. Configure them in the Convex dashboard or with `pnpm exec convex env set`, then rerun the command.

The owner creates collaborator invitations in the hosted app's Settings page. Each invitation is bound to an email and a randomly generated code; the owner shares those details with the intended collaborator. Removing an unused invitation revokes its code. Sign-up accepts only the configured owner email with the owner setup code or a matching collaborator email/code pair. Each collaborator starts with a separate empty workspace, and the owner cannot inspect their profile, applications, or files.

## 2. Private application worker

Posting fetch/guard and pdfcn/Takumi rendering run in a dedicated Node worker. Deploy the repository root as a private Node service with Node 22+, Python 3, and either the `pypdf` Python package or Poppler `pdfinfo`/`pdftotext` available. Install the app packages, then use `pnpm --dir app start:worker`. Set `APP_WORKER_SECRET` on the worker to the same random secret configured on Convex. Do not expose this secret in frontend settings or logs. The worker does not read or write the candidate archive; it uses temporary files only for PDF rendering and returns the bytes to Convex Storage.

Convex cloud actions cannot call a loopback URL. While using a cloud development deployment, point `APP_WORKER_URL` to a publicly reachable HTTPS development worker. The worker is HMAC-authenticated and accepts only its two internal action routes.

Copy `.env.example` to `.env.local` and set:

- `VITE_CONVEX_URL`: the development deployment's `*.convex.cloud` URL.
- `VITE_CONVEX_SITE_URL`: the matching `*.convex.site` URL used for authenticated file downloads.

Run the local hosted frontend with `pnpm dev:hosted`. The repository-based app can continue running at port 4173.

## 3. Production deployment

1. Create a separate Convex production deployment and configure the same environment values there. Set `APP_ORIGIN` to the exact production frontend origin and `APP_WORKER_URL` to the deployed private worker's HTTPS origin. Set a unique production `APP_OWNER_SETUP_CODE` and rotate it after the owner account is created.
2. Configure production signing keys for Convex Auth by running `pnpm exec auth --prod --web-server-url <production-frontend-origin>` and following the prompts. Set the production `APP_OWNER_EMAIL` before the first owner sign-up.
3. Run `pnpm convex:deploy` from `app`.
4. Build the frontend with `pnpm build:hosted` and host `app/dist-hosted` as a static single-page app. Configure the host's SPA fallback to `index.html` and set `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` at build time.
5. Verify sign-in, invite-only registration, profile editing, the worker-to-Convex connection, and access to private files before importing personal data.

### Netlify frontend

The repository-root `netlify.toml` configures Netlify to build the hosted React app from `app` with Node.js 22, publish `dist-hosted`, and route SPA requests to `index.html`. Branch deploys and Deploy Previews are configured to use the current **Convex development deployment**, so their data stays out of the future production database. The Convex URLs are public client configuration; no API secrets are stored in Netlify.

The current working branch is `features/UI-design-one`; it must be pushed to `origin` before Netlify can deploy it. Keep the repository's default branch (`master`) as Netlify's production branch and enable a branch deploy for `features/UI-design-one`. Netlify will give the feature branch its own preview URL, which can update on each push. This does not merge the feature into `master`; merge when the app is finalized.

After Netlify creates the branch URL, set the Convex development deployment's `APP_ORIGIN` to that exact origin to enable private-file downloads from the preview. The current local origin is also used by this development deployment, so local private-file downloads may need the origin switched back while working locally. Before final production, create a separate Convex production deployment, set Netlify production build variables to its `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL`, and set production `APP_ORIGIN` and `SITE_URL` to the final site origin. Production `APP_WORKER_URL` must point to a persistent HTTPS worker deployment; the temporary Cloudflare Quick Tunnel used locally is not suitable for production. Keep `APP_WORKER_SECRET` on Convex and the worker host; do not add it or `OLLAMA_API_KEY` to Netlify frontend variables.

No Convex deployment credentials are committed to the repository. The repository does not contain service account credentials, so creating cloud services and deploying them must be completed from an account where you are signed in.

## 4. Data import

Use **Download workspace export** in the local app's Settings page. In the hosted app, choose the JSON file under **Settings → Import your local workspace**. The browser displays the export timestamp, application/file counts, existing duplicates, and files omitted by local limits before confirmation. Only the confirmed import writes profile, tracker, and file data to the signed-in account.

Do not import the same local archive into a collaborator's account unless that collaborator is meant to own a copy. Workspaces are isolated; there is no administrator access to another account's profile, applications, or documents.

## 5. Current migration boundary

The hosted app handles account-scoped profile editing, application tracking, import/export, private file uploads/downloads, posting preparation, fit assessment, Ollama drafting/review, and automatic pdfcn/Takumi PDF generation. Interview preparation and transcript-evidence extraction still run through the local app. The local app and repository archive remain available.
