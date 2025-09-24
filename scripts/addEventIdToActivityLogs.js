// scripts/addEventIdToActivityLogs.js
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

async function runMigration() {
  try {
    await client.connect();
    // Add 'event_id' column to activity_logs table if it does not exist
    await client.query('ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id);');
    // Optional index to speed up event-level queries
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_event_action_time ON activity_logs(event_id, action, timestamp);');
    console.log("✅ 'event_id' added to activity_logs and index created.");
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
