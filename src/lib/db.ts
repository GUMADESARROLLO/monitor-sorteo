import { existsSync } from 'node:fs'
import sql from 'mssql'

// The production server (node dist/server/entry.mjs) doesn't load .env on its own.
if (!process.env.DB_SQL_HOST && existsSync('.env')) process.loadEnvFile('.env')

let pool: Promise<sql.ConnectionPool> | null = null

export function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    const env = process.env
    if (!env.DB_SQL_HOST) throw new Error('DB_SQL_HOST is not configured')

    pool = new sql.ConnectionPool({
      server: env.DB_SQL_HOST,
      database: env.DB_SQL_DATABASE,
      user: env.DB_SQL_USERNAME,
      password: env.DB_SQL_PASSWORD,
      options: { encrypt: true, trustServerCertificate: env.DB_SQL_TRUST_CERT === 'true' },
      connectionTimeout: 15_000,
      requestTimeout: 30_000,
    })
      .connect()
      .catch((err) => {
        pool = null // allow a retry on the next refresh
        throw err
      })
  }
  return pool
}

export { sql }
