const pool = require('./db');

async function updateAllDates() {
  try {
    console.log('Updating all daily_stats dates by adding 1 day...');
    console.log('This will fix the display issue where dates show one day behind');
    
    const result = await pool.query(`
      UPDATE daily_stats
      SET date = date + INTERVAL '1 day'
    `);
    
    console.log(`Updated ${result.rowCount} records`);
    
    // Verify the update
    const checkResult = await pool.query(`
      SELECT 
        date,
        TO_CHAR(date, 'YYYY-MM-DD') as formatted_date
      FROM daily_stats
      WHERE date >= '2026-07-20'
      ORDER BY date DESC
      LIMIT 5
    `);
    
    console.log('\nSample updated dates:');
    checkResult.rows.forEach(row => {
      console.log(`  ${row.formatted_date}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAllDates();
