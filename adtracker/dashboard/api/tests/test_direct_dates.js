const pool = require('./db');

async function testDirectDates() {
  try {
    // Test exactly what the API would receive
    const from = '2026-07-23';
    const to = '2026-07-30';
    
    console.log('Testing direct date comparison (no parsing):');
    console.log(`  from: ${from} (type: ${typeof from})`);
    console.log(`  to: ${to} (type: ${typeof to})`);
    
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date::date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions
      FROM daily_stats ds
      WHERE ds.date::date BETWEEN $1::date AND $2::date
      GROUP BY ds.date::date
      ORDER BY ds.date::date ASC
    `, [from, to]);
    
    console.log('\nQuery results:');
    result.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.impressions} impressions`);
    });
    
    console.log(`\nExpected dates: 2026-07-23 to 2026-07-30`);
    console.log(`Actual dates returned: ${result.rows.map(r => r.date).join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDirectDates();
