const pool = require('./db');

async function bulkSyncAllLeads() {
  try {
    console.log('Starting bulk sync of all leads with date-based attribution...');
    
    // Get all leads that need syncing
    const leadsResult = await pool.query(`
      SELECT id, email, created_at, keyword_id, campaign_id, ad_group_id, gclid, raw_keyword_text
      FROM leads
      WHERE created_at IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${leadsResult.rows.length} leads to process`);
    
    const updates = [];
    const noStatsFound = [];
    let processed = 0;
    
    for (const lead of leadsResult.rows) {
      processed++;
      
      // Get the lead's creation date
      const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
      
      // Try to find matching stats for this lead's date
      let statsResult;
      
      // First try: if lead has existing keyword_id, check if it matches stats for that date
      if (lead.keyword_id) {
        statsResult = await pool.query(
          `SELECT ds.keyword_id, ds.campaign_id, ds.ad_group_id, k.text as keyword_text
           FROM daily_stats ds
           JOIN keywords k ON k.id = ds.keyword_id
           WHERE ds.date = $1 AND ds.keyword_id = $2
           LIMIT 1`,
          [leadDate, lead.keyword_id]
        );
      }
      
      // Second try: if lead has raw_keyword_text, try to match by text
      if ((!statsResult || statsResult.rows.length === 0) && lead.raw_keyword_text) {
        statsResult = await pool.query(
          `SELECT ds.keyword_id, ds.campaign_id, ds.ad_group_id, k.text as keyword_text
           FROM daily_stats ds
           JOIN keywords k ON k.id = ds.keyword_id
           WHERE ds.date = $1 AND LOWER(k.text) = LOWER($2)
           LIMIT 1`,
          [leadDate, lead.raw_keyword_text]
        );
      }
      
      // Third try: if lead has gclid, try to find any keyword active on that date
      // (This is a fallback - we'll just pick any keyword from that date)
      if (!statsResult || statsResult.rows.length === 0) {
        statsResult = await pool.query(
          `SELECT ds.keyword_id, ds.campaign_id, ds.ad_group_id, k.text as keyword_text
           FROM daily_stats ds
           JOIN keywords k ON k.id = ds.keyword_id
           WHERE ds.date = $1
           LIMIT 1`,
          [leadDate]
        );
      }
      
      if (!statsResult || statsResult.rows.length === 0) {
        noStatsFound.push({ 
          id: lead.id, 
          email: lead.email, 
          date: leadDate,
          raw_keyword: lead.raw_keyword_text 
        });
        continue;
      }
      
      const stats = statsResult.rows[0];
      
      // Only update if something changed
      if (lead.keyword_id !== stats.keyword_id || 
          lead.campaign_id !== stats.campaign_id || 
          lead.ad_group_id !== stats.ad_group_id ||
          lead.raw_keyword_text !== stats.keyword_text) {
        updates.push({
          leadId: lead.id,
          keywordId: stats.keyword_id,
          campaignId: stats.campaign_id,
          adGroupId: stats.ad_group_id,
          email: lead.email,
          date: leadDate,
          keywordText: stats.keyword_text,
          oldKeywordId: lead.keyword_id
        });
      }
      
      if (processed % 50 === 0) {
        console.log(`Processed ${processed}/${leadsResult.rows.length} leads...`);
      }
    }
    
    console.log(`\nUpdates to perform: ${updates.length}`);
    console.log(`No stats found: ${noStatsFound.length}`);
    
    if (noStatsFound.length > 0 && noStatsFound.length < 20) {
      console.log('No stats found details:');
      noStatsFound.forEach(item => {
        console.log(`  ${item.email} (ID: ${item.id}) - ${item.date} - keyword: ${item.raw_keyword || 'N/A'}`);
      });
    } else if (noStatsFound.length >= 20) {
      console.log(`No stats found for ${noStatsFound.length} leads (showing first 20):`);
      noStatsFound.slice(0, 20).forEach(item => {
        console.log(`  ${item.email} (ID: ${item.id}) - ${item.date} - keyword: ${item.raw_keyword || 'N/A'}`);
      });
    }
    
    // Perform updates in batches
    const batchSize = 50;
    let updated = 0;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        
        if (update.keywordId !== null) {
          setClauses.push(`keyword_id = $${paramIndex}::bigint`);
          values.push(update.keywordId);
          paramIndex++;
        }
        
        if (update.campaignId !== null) {
          setClauses.push(`campaign_id = $${paramIndex}::bigint`);
          values.push(update.campaignId);
          paramIndex++;
        }
        
        if (update.adGroupId !== null) {
          setClauses.push(`ad_group_id = $${paramIndex}::bigint`);
          values.push(update.adGroupId);
          paramIndex++;
        }
        
        if (update.keywordText !== null) {
          setClauses.push(`raw_keyword_text = $${paramIndex}`);
          values.push(update.keywordText);
          paramIndex++;
        }
        
        if (setClauses.length === 0) {
          continue;
        }
        
        values.push(update.leadId);
        
        const updateQuery = `
          UPDATE leads 
          SET ${setClauses.join(', ')}
          WHERE id = $${paramIndex}::bigint
        `;
        
        await pool.query(updateQuery, values);
        updated++;
      }
      
      console.log(`Updated batch ${Math.floor(i / batchSize) + 1}: ${batch.length} leads`);
    }
    
    console.log('\nBulk sync completed!');
    console.log(`Total processed: ${processed}`);
    console.log(`Total updated: ${updated}`);
    console.log(`No stats found: ${noStatsFound.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error during bulk sync:', error);
    process.exit(1);
  }
}

bulkSyncAllLeads();
