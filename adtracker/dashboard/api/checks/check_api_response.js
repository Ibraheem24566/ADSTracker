const pool = require('./db');

async function checkApiResponse() {
  try {
    // Simulate the exact API call for "By date" grouping
    const from = '2026-07-28';
    const to = '2026-07-28';
    
    console.log('Testing API response for July 28th:');
    console.log(`  from: ${from}, to: ${to}`);
    
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions
      FROM daily_stats ds
      WHERE ds.date BETWEEN $1 AND $2
      GROUP BY TO_CHAR(ds.date, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(ds.date, 'YYYY-MM-DD') ASC
    `, [from, to]);
    
    console.log('\nRaw query results:');
    result.rows.forEach(row => {
      console.log(`  date: ${row.date} (type: ${typeof row.date})`);
    });
    
    // Simulate withDerivedMetrics
    const processed = result.rows.map(row => ({
      ...row,
      date: row.date ? String(row.date) : null
    }));
    
    console.log('\nAfter withDerivedMetrics:');
    processed.forEach(row => {
      console.log(`  date: ${row.date} (type: ${typeof row.date})`);
    });
    
    // Simulate JSON serialization
    const json = JSON.stringify(processed);
    console.log('\nJSON string:');
    console.log(json);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkApiResponse();
