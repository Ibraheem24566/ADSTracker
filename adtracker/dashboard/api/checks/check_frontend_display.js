// Test to see if the frontend is somehow converting dates
const pool = require('./db');

async function checkFrontendDisplay() {
  try {
    console.log('Testing what the frontend receives...');
    
    // Simulate the exact API response
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions
      FROM daily_stats ds
      WHERE ds.date BETWEEN '2026-07-28' AND '2026-07-28'
      GROUP BY TO_CHAR(ds.date, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(ds.date, 'YYYY-MM-DD') ASC
    `);
    
    console.log('Raw API response:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check if the date is actually a Date object or string
    console.log('\nDate field type check:');
    result.rows.forEach(row => {
      console.log(`date value: ${row.date}`);
      console.log(`date type: ${typeof row.date}`);
      console.log(`is Date object: ${row.date instanceof Date}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFrontendDisplay();
