// Script to add 'detail' column to activity_logs table using node-postgres
const { Client } = require('pg');

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('POSTGRES_URL is not set in environment.');
  process.exit(1);
}

const client = new Client({ connectionString });

async function addDetailColumn() {
  try {
    await client.connect();
    await client.query('ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS detail TEXT;');
    console.log("Column 'detail' added to activity_logs table (if not already present).");
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addDetailColumn();
