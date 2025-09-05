// scripts/addActivityLogDetailColumn.js
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

async function runMigration() {
  try {
    await client.connect();
    // Add 'detail' column to activity_logs table if it does not exist
    await client.query('ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS detail TEXT;');
    console.log("✅ 'detail' column added to activity_logs table.");
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
