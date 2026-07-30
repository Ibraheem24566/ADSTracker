const pool = require('./db');

async function fixDatesTimezone() {
  try {
    console.log('Checking if dates need timezone correction...');
    
    // The issue might be that dates were stored as UTC but should be local
    // Let's check if adding 1 day would fix the display issue
    const result = await pool.query(`
      SELECT 
        date,
        date + INTERVAL '1 day' as corrected_date
      FROM daily_stats
      WHERE date >= '2026-07-20'
      LIMIT 5
    `);
    
    console.log('Sample dates with +1 day correction:');
    result.rows.forEach(row => {
      console.log(`Original: ${row.date}, Corrected: ${row.corrected_date}`);
    });
    
    // If the user wants to resync, we can update all dates by adding 1 day
    // This would fix the display issue if the dates were stored as UTC midnight
    console.log('\nTo fix this, we can update all dates by adding 1 day.');
    console.log('This will change dates like 2026-07-20 to 2026-07-21');
    console.log('Do you want to proceed with this update?');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDatesTimezone();
