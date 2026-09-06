const { Client } = require("pg");

async function main() {
  const adminUrls = [
    "postgresql://postgres:postgres@localhost:5432/postgres",
    "postgresql://postgres:postgres@localhost:5432/smart_store_manager",
    "postgresql://appuser:password@localhost:5432/smart_store_manager",
  ];

  for (const url of adminUrls) {
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      const r = await client.query("SELECT current_user, current_database()");
      console.log("SUCCESS", url, JSON.stringify(r.rows[0]));
    } catch (e) {
      console.log("FAIL", url, e.message);
    } finally {
      try {
        await client.end();
      } catch {}
    }
  }

  const admin = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/postgres",
  });
  try {
    await admin.connect();
    await admin.query(
      "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'appuser') THEN CREATE ROLE appuser WITH LOGIN PASSWORD 'password'; END IF; END $$;",
    );
    await admin.query("ALTER DATABASE smart_store_manager OWNER TO appuser;");
    await admin.query(
      "GRANT ALL PRIVILEGES ON DATABASE smart_store_manager TO appuser;",
    );
    console.log("ROLE_AND_DB_PRIVS_OK");
  } catch (e) {
    console.log("ADMIN_FIX_ERROR", e.message);
  } finally {
    try {
      await admin.end();
    } catch {}
  }

  const app = new Client({
    connectionString:
      "postgresql://appuser:password@localhost:5432/smart_store_manager",
  });
  try {
    await app.connect();
    await app.query("GRANT ALL ON SCHEMA public TO appuser;");
    await app.query(
      "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;",
    );
    await app.query(
      "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser;",
    );
    await app.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;",
    );
    await app.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO appuser;",
    );
    console.log("SCHEMA_GRANTS_OK");

    const tables = await app.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    console.log("TABLES", JSON.stringify(tables.rows));

    const users = await app.query("SELECT * FROM users LIMIT 5");
    console.log("USERS", JSON.stringify(users.rows));
  } catch (e) {
    console.log("APP_FIX_ERROR", e.message);
  } finally {
    try {
      await app.end();
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
