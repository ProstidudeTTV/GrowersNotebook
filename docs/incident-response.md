# Incident response

Short operational checklist for Growers Notebook production incidents.

## First 15 minutes

1. Confirm scope: auth, API, web, storage, or database.
2. Freeze risky changes. Do not deploy unrelated work while triaging.
3. Check Render deploy status, API logs, and Supabase logs/advisors.
4. If user data may be exposed, preserve timestamps, request IDs, and affected routes before making changes.

## Containment

- **Compromised account:** ban or suspend the user from the admin panel, invalidate their active session if possible, and review recent moderation/audit events.
- **Leaked token or secret:** rotate the affected secret immediately and redeploy both services if the secret is used at runtime.
- **Abusive traffic:** tighten route-level rate limits, disable the affected feature path if needed, and watch for follow-on traffic in Render/Supabase logs.
- **Unsafe content or XSS:** unpublish or remove the content, confirm sanitization on both write and read paths, and review other recent content with the same origin.

## Secret rotation

- Supabase service role key
- Supabase JWT secret or signing configuration if auth compromise is suspected
- Render environment variables related to email, analytics, or storage processing
- GitHub tokens, deploy keys, or CI secrets used by workflows
- Any Sentry auth token used for build-time artifact upload

## Maintenance mode

- If the API or data is not trustworthy, enable maintenance mode via `site_config`.
- Prefer a clear read-only banner over leaving broken mutating flows active.

## Data recovery

1. Confirm the last known good time window.
2. Use Supabase backups/branching to inspect a restore candidate before restoring production data.
3. Verify critical entities after recovery: profiles, posts, notebooks, comments, follows, and moderation data.
4. Record what was restored and what was not.

## Communication

- Internal: maintainer notes what happened, when it started, and what was changed.
- User-facing: explain impact, remediation, and whether password resets or re-login are required.
- Vendor escalation:
  - Render support for deploy/runtime platform incidents
  - Supabase support for database/auth/storage incidents
  - GitHub support only if CI/repo access is part of the incident

## Post-incident

1. Write a short timeline.
2. Capture root cause and concrete prevention items.
3. Add or tighten tests, alerts, rate limits, or policies before closing the incident.
