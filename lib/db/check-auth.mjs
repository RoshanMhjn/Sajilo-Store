import pg from "pg";

const { Client } = pg;

const url = "postgresql://appuser:password@localhost:5432/smart_store_manager";

const client = new Client({ connectionString: url });

try {
  await client.connect();
  const result = await client.query(
    "SELECT id, name, email, password, role FROM users ORDER BY id",
  );
  console.log("DB_ROWS");
  console.log(JSON.stringify(result.rows, null, 2));
} catch (err) {
  console.error("DB_ERROR");
  console.error(err);
} finally {
  await client.end().catch(() => {});
}

const body = JSON.stringify({ email: "demo@store.com", password: "password" });
const res = await fetch("http://localhost:5002/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
});
console.log("HTTP_STATUS", res.status);
console.log("HTTP_TEXT", await res.text());
