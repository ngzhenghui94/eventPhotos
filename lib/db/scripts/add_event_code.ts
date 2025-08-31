#!/usr/bin/env tsx
import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error('POSTGRES_URL is not set.');
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  try {
    console.log('Connecting to database...');
    await sql`select 1`;

    console.log('Adding column events.event_code if missing...');
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS event_code varchar(50);`;

    console.log('Backfilling missing event_code values...');
    await sql`
      UPDATE events
      SET event_code = UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8))
      WHERE event_code IS NULL;
    `;

    console.log('Setting NOT NULL constraint on event_code...');
    await sql`ALTER TABLE events ALTER COLUMN event_code SET NOT NULL;`;

    console.log('Creating unique index if not exists...');
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS events_event_code_unique ON events (event_code);`;

    const [{ cnt }] = await sql<{ cnt: number }[]>`SELECT COUNT(*)::int AS cnt FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_code';`;
    if (cnt !== 1) {
      throw new Error('event_code column not found after migration.');
    }

    const [{ nulls }] = await sql<{ nulls: number }[]>`SELECT COUNT(*)::int AS nulls FROM events WHERE event_code IS NULL;`;
    if (nulls > 0) {
      throw new Error(`Backfill incomplete: ${nulls} rows still missing event_code.`);
    }

    console.log('Done. events.event_code added/backfilled and uniquely indexed.');
  } catch (err: any) {
    console.error('Migration failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();
