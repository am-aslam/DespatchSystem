import pg from "pg";

const { Pool, types } = pg;

types.setTypeParser(20, (value) => parseInt(value, 10));
types.setTypeParser(1700, (value) => parseFloat(value));

let pool;

export class DatabaseConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DatabaseConfigurationError";
    this.statusCode = 500;
  }
}

export class DatabaseConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = "DatabaseConnectionError";
    this.statusCode = 500;
  }
}

function getDatabaseUrl() {
  const url =
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!url) {
    throw new DatabaseConfigurationError(
      "Supabase Postgres is not configured on this deployment. Add SUPABASE_DATABASE_URL in Vercel Project Settings using the Supabase transaction pooler connection string."
    );
  }

  return url;
}

export function getPool() {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    const requiresSsl =
      process.env.PGSSLMODE === "require" ||
      connectionString.includes("supabase.co") ||
      connectionString.includes("pooler.supabase.com");

    pool = new Pool({
      connectionString,
      ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
      max: parseInt(process.env.POSTGRES_POOL_MAX || "10", 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return pool;
}

export async function query(text, params = []) {
  try {
    return await getPool().query(text, params);
  } catch (error) {
    if (
      error.code === "28P01" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.message?.toLowerCase().includes("timeout") ||
      error.message?.toLowerCase().includes("password authentication failed")
    ) {
      throw new DatabaseConnectionError(
        "Unable to connect to Supabase Postgres. Check SUPABASE_DATABASE_URL, database password, and pooler/direct connection settings."
      );
    }

    throw error;
  }
}

export async function withTransaction(callback) {
  let client;

  try {
    client = await getPool().connect();
  } catch (error) {
    if (
      error.code === "28P01" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.message?.toLowerCase().includes("timeout") ||
      error.message?.toLowerCase().includes("password authentication failed")
    ) {
      throw new DatabaseConnectionError(
        "Unable to connect to Supabase Postgres. Check SUPABASE_DATABASE_URL, database password, and pooler/direct connection settings."
      );
    }

    throw error;
  }

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
