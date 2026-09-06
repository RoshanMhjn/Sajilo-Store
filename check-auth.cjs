const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString:
      "postgresql://appuser:password@localhost:5432/smart_store_manager",
  });

  try {
    await client.connect();

    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    console.log("TABLES");
    console.log(JSON.stringify(tables.rows, null, 2));

    const users = await client.query(
      "SELECT id, name, email, password, role FROM users ORDER BY id LIMIT 20",
    );
    console.log("USERS");
    console.log(JSON.stringify(users.rows, null, 2));
  } catch (err) {
    console.error("DB_ERROR");
    console.error(err && err.stack ? err.stack : err);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
