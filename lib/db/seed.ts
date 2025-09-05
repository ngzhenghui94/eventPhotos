import { db } from './drizzle';
import { users } from './schema';

async function seed() {
  const email = 'test@test.com';

  const [user] = await db
    .insert(users)
    .values([
      {
        email: email,
        passwordHash: 'google-oauth',
        role: 'member',
      },
    ])
    .returning();

  console.log('Initial user created.');
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
