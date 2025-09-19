require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
});

async function run() {
    try {
        await client.connect();
        await client.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT TRUE;");
        console.log('✅ Added chat_enabled to events table (if missing).');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

run();


