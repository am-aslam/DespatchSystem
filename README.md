# Gold Ornaments Sales Dispatch Management System

Production Next.js app with a Supabase/PostgreSQL backend. The backend uses Supabase Auth for login, PostgreSQL constraints and transactions for data integrity, and RLS policies for defense in depth.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DATABASE_URL=
SUPABASE_EMPLOYEE_EMAIL_DOMAIN=aurum.local
PGSSLMODE=require
```

For the first admin seed, also set:

```bash
SEED_ADMIN_EMPLOYEE_ID=
SEED_ADMIN_NAME=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

## Database Setup

Apply the schema in `supabase/migrations/001_initial_schema.sql` to your Supabase project, then apply `supabase/seed.sql` for default settings.

Create the first admin account with:

```bash
npm run seed:supabase
```

No demo users are created automatically. Additional users should be created from the in-app User Management screen.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run build
```
