const pool = require('./db');

async function testFinalDates() {
  try {
    // Test the exact query that will be used
    const from = '2026-07-23';
    const to = '2026-07-30';
    
    console.log('Testing final performance API query:');
    console.log(`  from: ${from}`);
    console.log(`  to: ${to}`);
    
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions
      FROM daily_stats ds
      WHERE ds.date BETWEEN $1 AND $2
      GROUP BY TO_CHAR(ds.date, 'YYYY-MM-DD')
      ORDER BY ds.date ASC
    `, [from, to]);
    
    console.log('\nResults:');
    result.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.impressions} impressions`);
    });
    
    console.log(`\nExpected: 2026-07-23 to 2026-07-30`);
    console.log(`Got: ${result.rows.map(r => r.date).join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFinalDates();
