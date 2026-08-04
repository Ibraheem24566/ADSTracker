const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.mxsheezbjhgznqvcvsem:WwDPZKF8AS%23bNzM@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function runAttribution() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all unique dates from leads that need attribution
    const datesResult = await client.query(`
      SELECT DISTINCT DATE(created_at AT TIME ZONE 'America/Los_Angeles') as date
      FROM leads
      WHERE raw_keyword_text IS NOT NULL
        AND raw_keyword_text != ''
        AND campaign_id IS NOT NULL
        AND keyword_id IS NULL
    `);

    console.log(`Found ${datesResult.rows.length} dates to process`);

    let totalAttributed = 0;

    for (const row of datesResult.rows) {
      const date = row.date;
      console.log(`Processing date: ${date}`);

      // Find leads created on this date that need attribution
      const unmatchedLeads = await client.query(
        `SELECT id, raw_keyword_text, campaign_id, created_at
         FROM leads
         WHERE (created_at AT TIME ZONE 'America/Los_Angeles')::date = $1
         AND raw_keyword_text IS NOT NULL
         AND raw_keyword_text != ''
         AND campaign_id IS NOT NULL
         AND keyword_id IS NULL`,
        [date]
      );

      console.log(`Found ${unmatchedLeads.rows.length} leads to attribute on ${date}`);

      for (const lead of unmatchedLeads.rows) {
        // Try to match keyword from daily_stats
        const keywordMatch = await client.query(
          `SELECT ds.keyword_id, k.text, ds.ad_group_id
           FROM daily_stats ds
           JOIN keywords k ON ds.keyword_id = k.id
           JOIN ad_groups ag ON k.ad_group_id = ag.id
           WHERE ds.date = $1
           AND ag.campaign_id = $2
           AND LOWER(k.text) = LOWER($3)
           LIMIT 1`,
          [date, lead.campaign_id, lead.raw_keyword_text]
        );

        if (keywordMatch.rows.length > 0) {
          const match = keywordMatch.rows[0];
          // Update lead with matched keyword attribution
          await client.query(
            `UPDATE leads
             SET keyword_id = $1,
                 ad_group_id = $2,
                 match_status = 'matched',
                 updated_at = NOW()
             WHERE id = $3`,
            [match.keyword_id, match.ad_group_id, lead.id]
          );
          totalAttributed++;
          console.log(`Attributed lead ${lead.id} to keyword ${match.keyword_id}`);
        }
      }
    }

    await client.query('COMMIT');
    console.log(`Total leads attributed: ${totalAttributed}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error running attribution:', err);
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
}

runAttribution().catch(console.error);
