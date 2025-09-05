
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

async function runMigration() {
  try {
    await client.connect();
    // Add Stripe subscription fields to users table if they do not exist
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP;');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;');
    console.log("✅ Stripe subscription fields added to users table.");
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();

