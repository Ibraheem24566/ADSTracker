const pool = require('./db');

async function checkUnmatchedLeads() {
  try {
    console.log('Checking the 2 unmatched leads...');
    
    // Check the specific leads that couldn't be matched
    const leadsResult = await pool.query(`
      SELECT id, email, created_at, raw_keyword_text, keyword_id, campaign_id, ad_group_id
      FROM leads
      WHERE id IN (73, 74)
    `);
    
    console.log('Unmatched leads details:');
    leadsResult.rows.forEach(lead => {
      console.log(`ID: ${lead.id}, Email: ${lead.email}`);
      console.log(`  Created: ${lead.created_at}`);
      console.log(`  Raw keyword: ${lead.raw_keyword_text}`);
      console.log(`  Keyword ID: ${lead.keyword_id}`);
      console.log(`  Campaign ID: ${lead.campaign_id}`);
      console.log(`  Ad Group ID: ${lead.ad_group_id}`);
      console.log('---');
    });
    
    // Check if there's any daily_stats data for 2026-07-29
    const statsResult = await pool.query(`
      SELECT COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date
      FROM daily_stats
    `);
    
    console.log('\nDaily stats date range:');
    console.log(`  Total records: ${statsResult.rows[0].count}`);
    console.log(`  Min date: ${statsResult.rows[0].min_date}`);
    console.log(`  Max date: ${statsResult.rows[0].max_date}`);
    
    // Check if "solar installation quote" exists in keywords table
    const keywordResult = await pool.query(`
      SELECT id, text, ad_group_id
      FROM keywords
      WHERE LOWER(text) LIKE '%solar%'
    `);
    
    console.log('\nKeywords containing "solar":');
    keywordResult.rows.forEach(kw => {
      console.log(`  ID: ${kw.id}, Text: "${kw.text}", Ad Group ID: ${kw.ad_group_id}`);
    });
    
    // Check daily_stats for 2026-07-29 specifically
    const dateStats = await pool.query(`
      SELECT COUNT(*) as count
      FROM daily_stats
      WHERE date = '2026-07-29'
    `);
    
    console.log('\nDaily stats for 2026-07-29:');
    console.log(`  Records: ${dateStats.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUnmatchedLeads();
