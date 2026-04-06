const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "splitdumb",
  user: process.env.DB_USER || "splitdumb",
  password: process.env.DB_PASSWORD || "splitdumb",
  max: 2,
  connectionTimeoutMillis: 300,
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      balance NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER NOT NULL REFERENCES groups(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      paid_by INTEGER NOT NULL REFERENCES users(id),
      amount NUMERIC(10,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id SERIAL PRIMARY KEY,
      expense_id INTEGER NOT NULL REFERENCES expenses(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount NUMERIC(10,2) NOT NULL
    );
  `);
}

module.exports = { pool, initSchema };
