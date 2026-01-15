module.exports = {
  pg: {
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || "mac",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "pay0db"
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 3001
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me"
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || "",
    db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : 0
  }
};
