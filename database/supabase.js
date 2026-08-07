import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

let adminClient;

export class SupabaseConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SupabaseConfigurationError";
    this.statusCode = 500;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new SupabaseConfigurationError(`${name} is required for the Supabase backend.`);
  }
  return value;
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        realtime: {
          transport: WebSocket,
        },
      }
    );
  }

  return adminClient;
}

export function getAuthEmailForEmployee(employeeId, email = null) {
  if (email) return email.trim().toLowerCase();

  const domain = process.env.SUPABASE_EMPLOYEE_EMAIL_DOMAIN || "aurum.local";
  return `${employeeId.trim().toLowerCase()}@${domain}`;
}
