import readline from 'node:readline';
import { client } from './drizzle';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
  const force = process.argv.includes('--force') || process.argv.includes('-y');
  if (!force) {
    const ans = (await ask('This will TRUNCATE all tables and delete ALL DATA. Type RESET to confirm: ')).trim();
    if (ans !== 'RESET') {
      console.log('Aborted.');
      process.exit(1);
    }
  }

  const tables = [
    'activity_logs',
    'invitations',
    'verification_tokens',
    'photos',
    'events',
    'team_members',
    'teams',
    'users',
  ];

  const sql = `TRUNCATE TABLE ${tables.map((t) => '"' + t + '"').join(', ')} RESTART IDENTITY CASCADE;`;

  try {
    console.log('Running:', sql);
    await client.unsafe(sql);
    console.log('Database reset complete.');
  } catch (err) {
    console.error('Failed to reset database:', err);
    process.exit(1);
  } finally {
    await (client as any).end?.();
  }
}

main();
