import dotenv from 'dotenv';
import postgres from 'postgres';
import dns from 'dns/promises';
import { performance } from 'perf_hooks';

dotenv.config();

const url = process.env.POSTGRES_URL;
if (!url) throw new Error('No url');

async function benchmark() {
    console.log('--- Starting Benchmark ---');

    // 1. DNS Resolution
    const hostname = new URL(url!).hostname;
    const startDns = performance.now();
    const addresses = await dns.lookup(hostname);
    console.log(`DNS Lookup (${hostname}): ${(performance.now() - startDns).toFixed(2)}ms`, addresses);

    // 2. Connect & Query
    const sql = postgres(url!, {
        connect_timeout: 10,
        idle_timeout: 20,
        max: 1
    });

    const startConnect = performance.now();
    await sql`SELECT 1`;
    const connectTime = performance.now() - startConnect;
    console.log(`First Connect + Query: ${connectTime.toFixed(2)}ms`);

    // 3. Subsequent Query (using established pool)
    const startQuery = performance.now();
    await sql`SELECT 1`;
    console.log(`Subsequent Query (pooled): ${(performance.now() - startQuery).toFixed(2)}ms`);

    // 4. Force SSL check (simulated)
    // 5. Check latency to region if possible (ping is not reliable in node usually)

    await sql.end();
}

benchmark().catch(console.error);
