'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function main() {
  const email = (process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || '';
  const name = process.env.PROVISION_ADMIN_NAME || 'Runtime Admin';
  if (!email || password.length < 12) throw new Error('Runtime admin email and a 12+ character password are required');
  await pool.query(
    `INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,'admin')
     ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password=EXCLUDED.password,role='admin'`,
    [name, email, await bcrypt.hash(password, 12)],
  );
  console.log('Runtime admin is ready.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
