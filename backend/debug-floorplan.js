// Debug script to check floor plan data in database
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'wifi-mapper.db');
const db = new Database(dbPath, { verbose: console.log });

console.log('\n=== CHECKING DATABASE SCHEMA ===\n');

try {
  // First, let's see what tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Available tables:', tables.map(t => t.name).join(', '));
  
  // Check schema for FLOOR_PLAN
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='FLOOR_PLAN'").get();
  console.log('\nFLOOR_PLAN schema:');
  console.log(schema.sql);
  
  // Try to get floor plans with the correct table name
  const floorPlans = db.prepare('SELECT * FROM FLOOR_PLAN').all();
  
  console.log('\n=== FLOOR PLANS IN DATABASE ===\n');
  
  floorPlans.forEach((fp, idx) => {
    console.log(`\nFloor Plan #${idx + 1}:`);
    console.log('  ID:', fp.FloorPlanId);
    console.log('  Name:', fp.Name);
    console.log('  Building:', fp.Building);
    console.log('  ImagePath:', fp.ImagePath);
    console.log('  ImageOriginalName:', fp.ImageOriginalName);
    console.log('  ImageMimeType:', fp.ImageMimeType);
    console.log('  ImageWidth:', fp.ImageWidth);
    console.log('  ImageHeight:', fp.ImageHeight);
    console.log('  ReferencePoints:', fp.ReferencePoints);
    console.log('  CreationDate:', fp.CreationDate);
    console.log('  UpdatedAt:', fp.UpdatedAt);
  });

  console.log('\n=== CHECKING FILE EXISTENCE ===\n');
  
  const fs = require('fs');
  floorPlans.forEach((fp) => {
    if (fp.ImagePath) {
      const fullPath = path.join(__dirname, '..', fp.ImagePath);
      const exists = fs.existsSync(fullPath);
      console.log(`File for "${fp.Name}": ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
      console.log(`  Expected path: ${fullPath}`);
      console.log(`  Relative ImagePath from DB: ${fp.ImagePath}`);
      if (!exists) {
        // Try to find it in uploads folder
        const uploadsPath = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsPath)) {
          const files = fs.readdirSync(uploadsPath);
          console.log('  Files in uploads folder:', files.join(', '));
        }
      }
    } else {
      console.log(`No ImagePath for "${fp.Name}"`);
    }
  });

} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
