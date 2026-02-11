# Secrets Management

This document specifies where secrets are stored and how to rotate API keys
for the Baseball Ledger project.

## Secret Storage Locations (REQ-ENV-009)

Secrets are stored in exactly three locations, matching the three environments
defined in REQ-MIG-010:

| Environment | Secret Storage       | Who Sets            | How Accessed                 |
|-------------|----------------------|---------------------|------------------------------|
| Local       | `.env.local`         | Developer           | `process.env` / `import.meta.env` |
| Staging     | Vercel env vars      | Tech lead           | Vercel runtime injection     |
| Production  | Vercel env vars      | Tech lead           | Vercel runtime injection     |

### Managed Secrets

| Variable                    | Environment Scope | Notes                                   |
|-----------------------------|-------------------|-----------------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server only       | Bypasses RLS; never exposed to browser  |
| `SUPABASE_DB_URL`           | Server only       | Direct PostgreSQL connection string     |
| `ANTHROPIC_API_KEY`         | Server only       | Claude API access; optional             |

### Non-Secret Client Variables

The Supabase anon key (`VITE_SUPABASE_ANON_KEY`) is intentionally client-exposed.
It is NOT a secret -- RLS policies (REQ-DATA-007, Section 20.6) enforce all access
control. This is the standard Supabase security model.

### Rules

1. No secret may have the `VITE_` prefix (which exposes values in the browser bundle).
2. `.env.local` is gitignored; `.env.example` is committed with placeholder values only.
3. Vercel environment variables are scoped per-environment (Preview vs Production).
4. GitHub Actions secrets are used only for CI (e.g., migration validation).

---

## API Key Rotation Policy (REQ-ENV-010)

### SUPABASE_SERVICE_ROLE_KEY

- **When to rotate**: If compromised or as part of periodic security review.
- **How to rotate**:
  1. Go to Supabase Dashboard > Settings > API.
  2. Generate a new service role key.
  3. Update the key in Vercel environment variables (both staging and production).
  4. Update the key in GitHub Actions secrets.
  5. Redeploy all Vercel environments to pick up the new key.
  6. Update `.env.local` for local development.
- **Downtime impact**: None. The old key becomes invalid immediately. Ensure all
  environments are updated before the dashboard regeneration completes.

### ANTHROPIC_API_KEY

- **When to rotate**: If compromised or as part of periodic security review.
- **How to rotate**:
  1. Go to the Anthropic Console (console.anthropic.com).
  2. Create a new API key.
  3. Update the key in Vercel environment variables (both staging and production).
  4. Update the key in GitHub Actions secrets.
  5. Revoke the old key in the Anthropic Console.
  6. Update `.env.local` for local development.
- **Downtime impact**: No downtime. AI features degrade gracefully to template
  fallbacks (REQ-AI-008) during the brief rotation window between revoking the
  old key and deploying the new one.

### SUPABASE_DB_URL

- **When to rotate**: If the database password is compromised.
- **How to rotate**:
  1. Reset the database password in Supabase Dashboard > Settings > Database.
  2. Update the connection string in Vercel environment variables.
  3. Update `.env.local` for local development.
- **Downtime impact**: Existing connections will drop. New connections will use
  the updated password. Server-side retry logic (REQ-ERR-015) handles transient
  connection failures during rotation.
