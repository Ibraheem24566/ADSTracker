const pool = require('./db');

async function checkSyncDates() {
  try {
    // Check the synced_at timestamps to see when data was synced
    const result = await pool.query(`
      SELECT 
        date,
        TO_CHAR(date, 'YYYY-MM-DD') as formatted_date,
        TO_CHAR(synced_at, 'YYYY-MM-DD HH24:MI:SS') as synced_at,
        synced_at::text as raw_synced_at
      FROM daily_stats
      WHERE date >= '2026-07-20'
      ORDER BY synced_at DESC
      LIMIT 10
    `);
    
    console.log('Recent syncs with timestamps:');
    result.rows.forEach(row => {
      console.log(`Date: ${row.formatted_date}, Synced at: ${row.synced_at}`);
      console.log(`  Raw synced_at: ${row.raw_synced_at}`);
    });
    
    // Check if there's a pattern in the date values
    const dateCheck = await pool.query(`
      SELECT 
        date,
        date::text as raw_date,
        date::timestamp with time zone as timestamp
      FROM daily_stats
      WHERE date >= '2026-07-20'
      LIMIT 5
    `);
    
    console.log('\nDate value types:');
    dateCheck.rows.forEach(row => {
      console.log(`Raw date: ${row.raw_date}, Timestamp: ${row.timestamp}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSyncDates();
