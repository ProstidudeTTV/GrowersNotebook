# Supabase auth on Render (email confirmation & `/auth/callback`)

The Next.js app exposes **`GET /auth/callback`** (`apps/web/app/auth/callback/route.ts`). Supabase redirects here with a `code` after the user clicks the email link.

## 1. Web service URL

Use your **Render web** public URL (Dashboard → **growers-notebook-web** → copy **URL**), for example:

`https://growers-notebook-web.onrender.com`

If you use a **custom domain**, use that HTTPS origin instead everywhere below.

## 2. Render environment (growers-notebook-web)

In the Render dashboard for **growers-notebook-web**, set:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | Same as step 1, **no trailing slash** (e.g. `https://growers-notebook-web.onrender.com`) |

This keeps post-login redirects correct behind Render’s proxy. If unset, the app falls back to the request URL / `X-Forwarded-*` headers.

You still need the usual Supabase client vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key), `NEXT_PUBLIC_API_URL`.

## 3. API CORS (`WEB_ORIGIN`)

On **growers-notebook-api**, set **`WEB_ORIGIN`** to that **same** public web origin (no trailing slash). The API rejects browser calls in production if this does not match.

## 4. Supabase Dashboard → Authentication → URL configuration

Open your project: **Authentication** → **URL Configuration**.

1. **Site URL**  
   Set to your production web origin (same as `NEXT_PUBLIC_SITE_URL` / step 1).

2. **Redirect URLs**  
   Add these entries (one per line; adjust hostname if yours differs). Supabase must allow the exact redirect your app sends (including query strings used for password reset):

   ```
   https://growers-notebook-web.onrender.com/auth/callback
   https://growers-notebook-web.onrender.com/auth/callback?next=/auth/update-password
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback?next=/auth/update-password
   ```

   (`localhost` is optional; keep it if you test email confirmation locally.)

   If **Site URL** is still `http://localhost:3000`, magic links and password resets can target localhost even on production. **Site URL** must be your public HTTPS origin (same as `NEXT_PUBLIC_SITE_URL`).

3. Save.

Email templates use the redirect you pass at sign-up (`emailRedirectTo`); it must be allowed here or Supabase will block the redirect.

## 5. Quick verification

1. Deploy web + API with env vars above.  
2. Sign up with a **new** email on production.  
3. Click the confirmation link; you should land on `/auth/callback`, then `/auth/complete`, then home with a session.

If you see `redirect_uri_mismatch` or the link sends you to the wrong host, recheck **Site URL**, **Redirect URLs**, and **`NEXT_PUBLIC_SITE_URL`** for typos and trailing slashes.
