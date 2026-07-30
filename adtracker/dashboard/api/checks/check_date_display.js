const pool = require('./db');

async function checkDateDisplay() {
  try {
    // Simulate exactly what the API does for "By date" grouping
    const from = '2026-07-23';
    const to = '2026-07-30';
    
    console.log('Simulating API call for "By date" grouping:');
    console.log(`  from: ${from}, to: ${to}`);
    
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions,
        SUM(ds.clicks) AS clicks
      FROM daily_stats ds
      WHERE ds.date BETWEEN $1 AND $2
      GROUP BY TO_CHAR(ds.date, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(ds.date, 'YYYY-MM-DD') ASC
    `, [from, to]);
    
    console.log('\nAPI response:');
    result.rows.forEach(row => {
      console.log(`  date: "${row.date}", impressions: ${row.impressions}`);
    });
    
    // Check if there's any timezone conversion happening in the JSON response
    console.log('\n--- Checking JSON serialization ---');
    const jsonString = JSON.stringify(result.rows);
    console.log('JSON string:', jsonString);
    
    // Parse it back to see if dates change
    const parsed = JSON.parse(jsonString);
    console.log('Parsed dates:', parsed.map(r => r.date));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDateDisplay();
