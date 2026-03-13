import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Check current user plans
const users = await pool.query("SELECT id, email, plan, api_limit, api_usage FROM users ORDER BY id");
console.log('Current users:');
users.rows.forEach(u => console.log(`  id=${u.id} email=${u.email} plan=${u.plan} api_limit=${u.api_limit} api_usage=${u.api_usage}`));

// Fix: update plan to 'professional' for users who have api_limit=1000 but still showing 'free'
const fixed = await pool.query(
    "UPDATE users SET plan = 'professional' WHERE api_limit = 1000 AND plan = 'free' RETURNING id, email"
);
console.log('\nFixed users:', fixed.rowCount, fixed.rows);

// Also fix enterprise
const fixed2 = await pool.query(
    "UPDATE users SET plan = 'enterprise' WHERE api_limit >= 999999 AND plan = 'free' RETURNING id, email"
);
console.log('Fixed enterprise users:', fixed2.rowCount, fixed2.rows);

await pool.end();
