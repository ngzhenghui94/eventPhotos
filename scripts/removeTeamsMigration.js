// scripts/removeTeamsMigration.js
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

async function runMigration() {
  try {
    await client.connect();

    // Drop team_members table if exists
    await client.query('DROP TABLE IF EXISTS team_members CASCADE;');
    // Drop teams table if exists
    await client.query('DROP TABLE IF EXISTS teams CASCADE;');

    // Remove team_id column and foreign key from events table
    await client.query('ALTER TABLE events DROP COLUMN IF EXISTS team_id;');
    await client.query('ALTER TABLE events DROP CONSTRAINT IF EXISTS events_team_id_teams_id_fk;');

    // Remove team_id column and foreign key from activity_logs table
    await client.query('ALTER TABLE activity_logs DROP COLUMN IF EXISTS team_id;');
    await client.query('ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_team_id_teams_id_fk;');

    // Remove team_id column and foreign key from invitations table
    await client.query('ALTER TABLE invitations DROP COLUMN IF EXISTS team_id;');
    await client.query('ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_team_id_teams_id_fk;');

    // Remove any team-related indexes
    await client.query('DROP INDEX IF EXISTS events_team_id_idx;');
    await client.query('DROP INDEX IF EXISTS activity_logs_team_id_idx;');
    await client.query('DROP INDEX IF EXISTS invitations_team_id_idx;');

    console.log('✅ Teams logic removed from database.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();