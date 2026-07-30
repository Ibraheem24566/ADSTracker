const pool = require('./db');

async function testApiDates() {
  try {
    // Simulate what the API receives from frontend
    const from = '2026-07-23';
    const to = '2026-07-30';
    
    console.log('Simulating API call with:');
    console.log(`  from: ${from}`);
    console.log(`  to: ${to}`);
    console.log(`  from type: ${typeof from}`);
    console.log(`  to type: ${typeof to}`);
    
    // Test the exact query used in the API
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date::date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions
      FROM daily_stats ds
      WHERE ds.date::date BETWEEN $1 AND $2
      GROUP BY ds.date::date
      ORDER BY ds.date::date ASC
    `, [from, to]);
    
    console.log('\nQuery results:');
    result.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.impressions} impressions`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testApiDates();
