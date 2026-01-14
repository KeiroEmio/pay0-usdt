module.exports = {
  pg: {
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || "mac",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "pay0db"
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 3000
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me"
  }
};
