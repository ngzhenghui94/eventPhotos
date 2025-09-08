# Migration Folder Realigned

This folder now contains migrations that match the current schema in `lib/db/schema.ts`.
- 0001_init.sql: Creates all tables and relations
- 0002_constraints.sql: Ensures constraints and indexes
- 0003_cleanup.sql: Removes legacy/teams tables
- 0004_seed.sql: Optional demo data

You may delete any old migration files not listed above.
