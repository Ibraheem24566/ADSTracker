const pool = require('./db');

async function testJsonResponse() {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions
      FROM daily_stats ds
      WHERE ds.date BETWEEN '2026-07-23' AND '2026-07-30'
      GROUP BY TO_CHAR(ds.date, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(ds.date, 'YYYY-MM-DD') ASC
    `);
    
    console.log('Raw query results:');
    result.rows.forEach(row => {
      console.log(`  date: ${row.date} (type: ${typeof row.date})`);
    });
    
    // Simulate what withDerivedMetrics does
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
    
    // Simulate frontend receiving and parsing
    const parsed = JSON.parse(json);
    console.log('\nAfter JSON.parse:');
    parsed.forEach(row => {
      console.log(`  date: ${row.date} (type: ${typeof row.date})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testJsonResponse();
