# Supabase auth (growersnotebook.com, email, `/auth/callback`)

The Next.js app exposes **`GET /auth/callback`** (`apps/web/app/auth/callback/route.ts`). Supabase redirects here with a `code` after the user clicks the email link.

## 1. Canonical public URL

Production site: **`https://growersnotebook.com`** (no trailing slash).

- In **Render** → **growers-notebook-web** → **Custom Domains**, attach `growersnotebook.com` (and optionally `www.growersnotebook.com`). Finish DNS + certificate verification.
- **`render.yaml`** sets **`NEXT_PUBLIC_SITE_URL=https://growersnotebook.com`** so `next build` embeds this origin in metadata, client auth helpers, and canonical URLs.
- **`WEB_ORIGIN`** on **growers-notebook-api** must be the **same** origin the browser uses (`https://growersnotebook.com`), or API CORS will block the web app.

If you ever serve the app **only** from `www.growersnotebook.com`, set **`NEXT_PUBLIC_SITE_URL`** and **`WEB_ORIGIN`** to `https://www.growersnotebook.com` instead, and use the same host in Supabase **Site URL** and **Redirect URLs** below.

## 2. Render environment (summary)

| Service | Variable | Value |
|---------|----------|--------|
| **growers-notebook-web** | `NEXT_PUBLIC_SITE_URL` | `https://growersnotebook.com` |
| **growers-notebook-api** | `WEB_ORIGIN` | `https://growersnotebook.com` |

You still need: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key), `NEXT_PUBLIC_API_URL` (your Nest API public URL, e.g. `https://growers-notebook-api.onrender.com` or a future `https://api.growersnotebook.com`).

`getPublicSiteOrigin()` prefers `NEXT_PUBLIC_SITE_URL`, then `X-Forwarded-Host` / `X-Forwarded-Proto` from Render so redirects stay correct behind the proxy.

## 3. Supabase Dashboard → Authentication → URL configuration

[Authentication → URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration) for your project.

1. **Site URL**  
   `https://growersnotebook.com`  
   (Must match **`NEXT_PUBLIC_SITE_URL`**.)

2. **Redirect URLs**  
   Add **exact** entries Supabase should allow (including query strings used for password reset). Example:

   ```
   https://growersnotebook.com/auth/callback
   https://growersnotebook.com/auth/callback/recovery
   ```

   If you use **www** for the app as well, add the same paths for `https://www.growersnotebook.com/...`.

   Optional: keep a **Render default hostname** during migration (e.g. `https://growers-notebook-web.onrender.com/auth/callback` and `.../auth/callback/recovery`) until traffic is only on the custom domain; then remove them.

3. Save.

Email and magic links use the redirect you pass from the app (`emailRedirectTo` / `redirectTo`); every distinct origin + path must appear in **Redirect URLs**.

**Password reset:** Requests use **`POST /api/auth/request-password-reset`**, which sets `redirectTo` to **`/auth/callback/recovery`**. If your **Reset password** email template still points at **`{{ .SiteURL }}/auth/callback`** (common), the main **`/auth/callback`** handler detects a **recovery** session (JWT **`amr`** / `?type=recovery`) and redirects to **`/auth/update-password`** instead of **`/auth/complete`** (which auto-navigates home).

**Session cookies:** Callbacks use a **`NextResponse.next()` cookie jar**, then **`redirectPreservingCookies`** so every `Set-Cookie` from `exchangeCodeForSession` is copied onto the final redirect (including when the recovery URL differs from the first response). Middleware only sets cookies on **`NextResponse.next()`**, not on **`request.cookies`** (Next.js does not treat the latter as the outgoing response).

### Reset password email template

Supabase builds the email link as **`/auth/v1/verify?...&redirect_to=...`**. If **`redirect_to`** is only your **Site URL** (e.g. `https://growersnotebook.com` with no path), after verify the user lands on **`/?code=...`**. The app’s middleware forwards that to **`/auth/callback`** so the session is created and recovery is routed to **`/auth/update-password`**.

**Better:** Under **Authentication** → **Email Templates** → **Reset password**, use the default link that uses **`{{ .ConfirmationURL }}`** (not a hand-built `{{ .SiteURL }}` only). `ConfirmationURL` includes the **`redirect_to`** your app sends from **`resetPasswordForEmail`** (e.g. `https://growersnotebook.com/auth/callback/recovery`), so users skip the home-page hop entirely.

Set **Site URL** to **`https://growersnotebook.com`** (not localhost) if you customized the template.

## 4. Custom SMTP (noreply@growersnotebook.com)

Use your own mail host so auth email comes from **`noreply@growersnotebook.com`**.

In the Dashboard: **Authentication** → **SMTP Settings** (enable custom SMTP), or use the [Management API](https://supabase.com/docs/reference/api/v1-update-auth-service-config) (`PATCH /v1/projects/{ref}/config/auth`) with fields such as:

| Field | Typical use |
|-------|----------------|
| `smtp_host` | Outbound host from your provider |
| `smtp_port` | Often `587` (STARTTLS) or `465` (SSL) — match provider docs |
| `smtp_user` / `smtp_pass` | SMTP credentials |
| `smtp_admin_email` | An address your provider accepts (often same as sender) |
| `smtp_sender_name` | Display name, e.g. `Growers Notebook` |

Use the **sender address** your provider authorizes (e.g. `noreply@growersnotebook.com`). At your DNS / mail host:

- **SPF**: include your provider’s SPF include (and Supabase’s if their docs require it for relay).
- **DKIM / DMARC**: follow your provider’s steps so inbox delivery is reliable.

After saving, send a test **signup** or **password reset** and confirm From / links point at **`https://growersnotebook.com`** (see **Site URL** and templates under **Authentication** → **Email Templates** — links should use **`{{ .SiteURL }}`** or **`{{ .RedirectTo }}`** per [email templates](https://supabase.com/docs/guides/auth/auth-email-templates)).

## 5. Optional: custom domain for Supabase API

Auth still works with the default `https://<project-ref>.supabase.co`. If you add a **Supabase custom domain** (e.g. `auth.growersnotebook.com`), update `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` everywhere to match; OAuth and redirect rules are unchanged as long as **Site URL** / **Redirect URLs** match the **Next** app origin (`growersnotebook.com`), not the Supabase host.

## 6. Quick verification

1. Deploy web + API with env vars above.  
2. Open `https://growersnotebook.com`, sign up with a **new** email.  
3. Click the confirmation link; you should hit `/auth/callback`, then `/auth/complete`, then home with a session.

If you see `redirect_uri_mismatch` or wrong host in the link, recheck **Site URL**, **Redirect URLs**, **`NEXT_PUBLIC_SITE_URL`**, and **`WEB_ORIGIN`**.
