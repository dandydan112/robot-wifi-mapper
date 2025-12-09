const { projectDb } = require('./db');

console.log('Cleaning up duplicate measurement points...\n');

// Find all measuring points and group by coordinates
const allPoints = projectDb.getAllMeasuringPoints();
console.log(`Total measuring points: ${allPoints.length}`);

// Group by X, Y coordinates
const grouped = {};
allPoints.forEach(mp => {
  const key = `${mp.X}_${mp.Y}`;
  if (!grouped[key]) {
    grouped[key] = [];
  }
  grouped[key].push(mp);
});

console.log(`Unique coordinate groups: ${Object.keys(grouped).length}\n`);

// Find groups with duplicates
let deletedCount = 0;
let readingsMoved = 0;

Object.entries(grouped).forEach(([coords, points]) => {
  if (points.length > 1) {
    console.log(`\nCoordinate ${coords} has ${points.length} points:`);
    
    // Sort by ID (oldest first)
    points.sort((a, b) => a.MeasuringpointId - b.MeasuringpointId);
    
    // Keep the first one (oldest), delete the rest
    const keepPoint = points[0];
    const deletePoints = points.slice(1);
    
    console.log(`  Keeping: ID ${keepPoint.MeasuringpointId} (${keepPoint.Name || 'unnamed'})`);
    
    deletePoints.forEach(dp => {
      // Move readings from duplicate point to the kept point
      const readings = projectDb.getAccessPointReadingsByMeasuringPoint(dp.MeasuringpointId);
      console.log(`  Deleting: ID ${dp.MeasuringpointId} (${dp.Name || 'unnamed'}) - ${readings.length} readings`);
      
      // Only move readings if they don't already exist in keepPoint
      if (readings.length > 0) {
        const existingReadings = projectDb.getAccessPointReadingsByMeasuringPoint(keepPoint.MeasuringpointId);
        const existingBssids = new Set(existingReadings.map(r => r.Bssid).filter(b => b));
        
        readings.forEach(r => {
          // Skip if we already have a reading with this BSSID
          if (r.Bssid && existingBssids.has(r.Bssid)) {
            console.log(`    Skipping duplicate reading: ${r.Ssid || r.Bssid}`);
            return;
          }
          
          // Move the reading to the kept point
          projectDb.createAccessPointReading(
            r.Ssid,
            r.Bssid,
            r.Rssi,
            r.Frequency,
            r.Channel,
            keepPoint.MeasuringpointId
          );
          readingsMoved++;
        });
      }
      
      // Delete the duplicate point (readings will cascade delete)
      projectDb.deleteMeasuringPoint(dp.MeasuringpointId);
      deletedCount++;
    });
  }
});

console.log(`\n✅ Cleanup complete!`);
console.log(`   Deleted ${deletedCount} duplicate measuring points`);
console.log(`   Moved ${readingsMoved} readings`);

// Show final stats
const finalPoints = projectDb.getAllMeasuringPoints();
console.log(`\n📊 Final state:`);
console.log(`   Total measuring points: ${finalPoints.length}`);

const readingCounts = finalPoints.map(mp => {
  const readings = projectDb.getAccessPointReadingsByMeasuringPoint(mp.MeasuringpointId);
  return {
    id: mp.MeasuringpointId,
    coords: `(${Math.round(mp.X)}, ${Math.round(mp.Y)})`,
    count: readings.length
  };
});

console.log(`\n   Points with most readings:`);
readingCounts.sort((a, b) => b.count - a.count).slice(0, 5).forEach(p => {
  console.log(`   - ID ${p.id} at ${p.coords}: ${p.count} readings`);
});
