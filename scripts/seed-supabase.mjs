import fs from "fs";
import path from "path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const { Pool } = pg;

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function authEmailForEmployee(employeeId) {
  const explicitEmail = process.env.SEED_ADMIN_EMAIL;
  if (explicitEmail) return explicitEmail.trim().toLowerCase();

  const domain = process.env.SUPABASE_EMPLOYEE_EMAIL_DOMAIN || "aurum.local";
  return `${employeeId.trim().toLowerCase()}@${domain}`;
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const databaseUrl =
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error("SUPABASE_DATABASE_URL, DATABASE_URL, or POSTGRES_URL is required.");
  }

  const employeeId = requiredEnv("SEED_ADMIN_EMPLOYEE_ID").trim().toUpperCase();
  const name = requiredEnv("SEED_ADMIN_NAME").trim();
  const password = requiredEnv("SEED_ADMIN_PASSWORD");
  const authEmail = authEmailForEmployee(employeeId);

  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });

  const existingAuthUser = await findAuthUserByEmail(supabase, authEmail);
  let authUser = existingAuthUser;

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        employee_id: employeeId,
        name,
        role: "ADMIN",
        requires_password_setup: false,
      },
    });

    if (error) throw error;
    authUser = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        employee_id: employeeId,
        name,
        role: "ADMIN",
        requires_password_setup: false,
      },
    });

    if (error) throw error;
    authUser = data.user;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.PGSSLMODE === "require" ||
      databaseUrl.includes("supabase.co") ||
      databaseUrl.includes("pooler.supabase.com")
        ? { rejectUnauthorized: false }
        : undefined,
  });

  try {
    await pool.query(
      `
        insert into public.users (id, employee_id, name, email, auth_email, role, status, first_login)
        values ($1, $2, $3, $4, $5, 'ADMIN', 'ACTIVE', false)
        on conflict (id) do update
        set employee_id = excluded.employee_id,
            name = excluded.name,
            email = excluded.email,
            auth_email = excluded.auth_email,
            role = 'ADMIN',
            status = 'ACTIVE',
            first_login = false,
            updated_at = now()
      `,
      [authUser.id, employeeId, name, process.env.SEED_ADMIN_EMAIL || null, authEmail]
    );

    await pool.query(
      `
        insert into public.settings (key, value)
        values
          ('company_name', 'AURUM JEWELLERS PVT LTD'),
          ('address', 'Gold Bazaar Road, Zaveri Market, Mumbai'),
          ('gstin', '27AAAAA0000A1Z5'),
          ('weight_decimals', '3')
        on conflict (key) do nothing
      `
    );
  } finally {
    await pool.end();
  }

  console.log(`Seeded admin user ${employeeId} (${authEmail}).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
