const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../prisma/migrations');
const dbFile = path.join(__dirname, '../dev.db');

if (fs.existsSync(migrationsDir)) {
  fs.rmSync(migrationsDir, { recursive: true, force: true });
  console.log('Deleted prisma/migrations');
}

if (fs.existsSync(dbFile)) {
  fs.rmSync(dbFile, { force: true });
  console.log('Deleted dev.db');
}
