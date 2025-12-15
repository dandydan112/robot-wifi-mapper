const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'wifi-mapper.db');
const db = new Database(dbPath);

console.log('=== Checking Floor Plan ID 52 ===\n');
console.log('Database path:', dbPath);

try {
  const floorPlan = db.prepare('SELECT * FROM FLOOR_PLAN WHERE FloorPlanId = ?').get(52);
  
  if (!floorPlan) {
    console.log('❌ Floor Plan ID 52 not found in database');
  } else {
    console.log('✅ Floor Plan found:');
    console.log(JSON.stringify(floorPlan, null, 2));
    console.log('\n--- Image Fields ---');
    console.log('ImagePath:', floorPlan.ImagePath);
    console.log('ImageOriginalName:', floorPlan.ImageOriginalName);
    console.log('ImageMimeType:', floorPlan.ImageMimeType);
    console.log('ImageWidth:', floorPlan.ImageWidth);
    console.log('ImageHeight:', floorPlan.ImageHeight);
  }
} catch (error) {
  console.error('Error:', error);
}

console.log('\n=== All Floor Plans ===\n');
const all = db.prepare('SELECT FloorPlanId, Name, ImagePath FROM FLOOR_PLAN').all();
all.forEach(fp => {
  console.log(`ID ${fp.FloorPlanId}: Name="${fp.Name}", ImagePath="${fp.ImagePath || 'NULL'}"`);
});

db.close();
