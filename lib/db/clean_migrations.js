// clean_migrations.js
// This script removes all migration files except the latest one for the 'category' column in the events table.
// Usage: node clean_migrations.js

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
const keepMigrations = [
  // Add the filename for the migration that adds the 'category' column to events table
  '0007_add_category_to_events.sql', // Update this if your actual filename is different
  'meta' // Keep meta folder
];

fs.readdirSync(migrationsDir).forEach(file => {
  if (!keepMigrations.includes(file)) {
    const filePath = path.join(migrationsDir, file);
    if (fs.lstatSync(filePath).isDirectory()) return;
    fs.unlinkSync(filePath);
    console.log(`Deleted: ${file}`);
  }
});

console.log('Migration folder cleaned. Only category migration and meta folder remain.');
