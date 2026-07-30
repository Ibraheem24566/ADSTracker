const pool = require('./db');

async function verifyLeadMatches() {
  try {
    console.log('Verifying all leads actually match keywords on their creation date...');
    
    // Get all leads that have keyword_id set
    const leadsResult = await pool.query(`
      SELECT id, email, created_at, keyword_id, campaign_id, ad_group_id, raw_keyword_text
      FROM leads
      WHERE keyword_id IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${leadsResult.rows.length} leads with keyword_id set`);
    
    const mismatchedLeads = [];
    let verified = 0;
    
    for (const lead of leadsResult.rows) {
      verified++;
      
      // Get the lead's creation date
      const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
      
      // Check if there's a daily_stats record for this keyword on this date
      const statsResult = await pool.query(
        `SELECT ds.keyword_id, ds.campaign_id, ds.ad_group_id, k.text as keyword_text
         FROM daily_stats ds
         JOIN keywords k ON k.id = ds.keyword_id
         WHERE ds.date = $1 AND ds.keyword_id = $2
         LIMIT 1`,
        [leadDate, lead.keyword_id]
      );
      
      if (statsResult.rows.length === 0) {
        // No match found - this lead should be unmatched
        mismatchedLeads.push({
          id: lead.id,
          email: lead.email,
          created_at: lead.created_at,
          leadDate: leadDate,
          keyword_id: lead.keyword_id,
          campaign_id: lead.campaign_id,
          ad_group_id: lead.ad_group_id,
          raw_keyword_text: lead.raw_keyword_text
        });
      }
      
      if (verified % 20 === 0) {
        console.log(`Verified ${verified}/${leadsResult.rows.length} leads...`);
      }
    }
    
    console.log(`\nVerification complete!`);
    console.log(`Total leads checked: ${leadsResult.rows.length}`);
    console.log(`Mismatched leads (no stats on creation date): ${mismatchedLeads.length}`);
    
    if (mismatchedLeads.length > 0) {
      console.log('\nMismatched leads details:');
      mismatchedLeads.forEach(lead => {
        console.log(`  ID: ${lead.id}, Email: ${lead.email}`);
        console.log(`    Created: ${lead.created_at} (${lead.leadDate})`);
        console.log(`    Keyword ID: ${lead.keyword_id}, Campaign ID: ${lead.campaign_id}`);
        console.log(`    Raw keyword: ${lead.raw_keyword_text}`);
        console.log('---');
      });
      
      // Update these leads to remove incorrect attribution
      console.log('\nUpdating mismatched leads to remove incorrect attribution...');
      let updated = 0;
      
      for (const lead of mismatchedLeads) {
        await pool.query(
          `UPDATE leads 
           SET keyword_id = NULL, 
               campaign_id = NULL, 
               ad_group_id = NULL,
               match_status = 'no_match'
           WHERE id = $1`,
          [lead.id]
        );
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`Updated ${updated}/${mismatchedLeads.length} leads...`);
        }
      }
      
      console.log(`\nSuccessfully updated ${updated} leads to remove incorrect attribution`);
    } else {
      console.log('\nAll leads are correctly matched! ✅');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyLeadMatches();
