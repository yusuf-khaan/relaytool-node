import knex from "knex";

const db = knex({
  client: "pg",
  connection: {
    host: process.env.DB_HOST || "172.25.192.1",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "relayhooks",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "123",
  },
  pool: { min: 2, max: 30 },
});



export default db;
