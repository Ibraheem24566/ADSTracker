const pool = require('./db');

async function testDateRange() {
  try {
    // Test what happens when user selects July 23-30
    const from = '2026-07-23';
    const to = '2026-07-30';
    
    console.log('Testing date range selection:');
    console.log(`  User selects: ${from} to ${to}`);
    
    // Check what the API returns for "By date" grouping
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions
      FROM daily_stats ds
      WHERE ds.date BETWEEN $1 AND $2
      GROUP BY TO_CHAR(ds.date, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(ds.date, 'YYYY-MM-DD') ASC
    `, [from, to]);
    
    console.log('\nAPI returns:');
    result.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.impressions} impressions`);
    });
    
    console.log(`\nUser expected: July 23-30`);
    console.log(`API returned: ${result.rows.map(r => r.date).join(', ')}`);
    
    // Now test if the issue is with the date input sending wrong dates
    // Simulate what happens when HTML date input is used
    console.log('\n--- Testing HTML date input behavior ---');
    const testDate = new Date('2026-07-23');
    console.log(`new Date('2026-07-23'): ${testDate.toISOString()}`);
    console.log(`toISOString().slice(0,10): ${testDate.toISOString().slice(0,10)}`);
    
    // Test with timezone offset
    const localDate = new Date(2026, 6, 23); // July 23 (month is 0-indexed)
    console.log(`\nnew Date(2026, 6, 23): ${localDate.toISOString()}`);
    console.log(`Local date string: ${localDate.toLocaleDateString()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDateRange();
