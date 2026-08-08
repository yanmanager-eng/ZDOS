# web-push-send

ZDOS Backend Web Push sender (Supabase Edge Function).

## Required secrets

Set via Supabase Dashboard → Edge Functions → Secrets (or CLI):

| Secret | Description |
|--------|-------------|
| `WEB_PUSH_VAPID_PUBLIC_KEY` or `VAPID_PUBLIC_KEY` | VAPID public key (same as frontend meta) |
| `WEB_PUSH_VAPID_PRIVATE_KEY` or `VAPID_PRIVATE_KEY` | VAPID **private** key — never put in frontend |
| `WEB_PUSH_VAPID_SUBJECT` or `VAPID_SUBJECT` | e.g. `mailto:ops@yourdomain.com` |
| `SUPABASE_URL` | Auto-injected on hosted Edge |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected on hosted Edge |
| `SUPABASE_ANON_KEY` | Auto-injected on hosted Edge |

Local key material lives only under `.zdos-local-secrets/vapid.json` (gitignored).

## Deploy (Founder / Ops)

```bash
supabase db push   # apply push_subscriptions migration
supabase secrets set \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="..." \
  VAPID_SUBJECT="mailto:zdos-admin@example.com"
supabase functions deploy web-push-send
```

## Security

- Private key must NOT appear in `index.html`, `manifest.json`, `sw.js`, or any public asset.
- Clients may only upsert their own `push_subscriptions` rows (RLS).
- Sending is server-side only via this function.
