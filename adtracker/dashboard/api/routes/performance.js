const express = require("express");
const pool = require("../db");

const router = express.Router();

function withDerivedMetrics(row) {
  const impressions = Number(row.impressions);
  const clicks = Number(row.clicks);
  const costMicros = Number(row.cost_micros);
  const conversions = Number(row.conversions);
  const leadCount = Number(row.lead_count || 0);

  return {
    ...row,
    impressions,
    clicks,
    cost: costMicros / 1_000_000,
    conversions,
    all_conversions: Number(row.all_conversions),
    lead_count: leadCount,
    ctr: impressions > 0 ? clicks / impressions : 0,
    avg_cpc: clicks > 0 ? costMicros / 1_000_000 / clicks : 0,
    conversion_rate: clicks > 0 ? conversions / clicks : 0,
    // Cost per conversion based on actual lead count, not Google conversions
    cost_per_conversion: leadCount > 0 ? costMicros / 1_000_000 / leadCount : null,
    // Cost per *actual lead in our system*, not just Google's conversion count --
    // useful in a ping-post setup where "conversion" (form submit) and
    // "lead we could actually sell" aren't always the same thing.
    cost_per_lead: leadCount > 0 ? costMicros / 1_000_000 / leadCount : null,
    avg_impression_share: row.avg_impression_share !== null ? Number(row.avg_impression_share) : null,
    avg_quality_score: row.avg_quality_score !== null ? Number(row.avg_quality_score) : null,
    // Ensure date is returned as string to prevent timezone conversion
    date: row.date ? String(row.date) : null,
  };
}

// GET /api/performance?from=&to=&group_by=keyword|campaign|date&campaign_id=
router.get("/", async (req, res) => {
  const { from, to, campaign_id } = req.query;
  const groupBy = req.query.group_by || "keyword";

  if (!from || !to) {
    return res.status(400).json({ error: "from and to date params are required (YYYY-MM-DD)" });
  }

  // Ensure dates are treated as local dates, not UTC
  // The date strings from frontend are already in YYYY-MM-DD format, use them directly
  const fromDate = from;
  const toDate = to;

  const campaignFilter = campaign_id ? "AND ds.campaign_id = $3" : "";
  const params = campaign_id ? [from, to, campaign_id] : [from, to];

  let query;

  if (groupBy === "keyword") {
    query = `
      SELECT
        k.id AS keyword_id, k.text AS keyword_text,
        ag.id AS ad_group_id, ag.name AS ad_group_name,
        c.id AS campaign_id, c.name AS campaign_name,
        SUM(ds.impressions) AS impressions,
        SUM(ds.clicks) AS clicks,
        SUM(ds.cost_micros) AS cost_micros,
        SUM(ds.conversions) AS conversions,
        SUM(ds.all_conversions) AS all_conversions,
        AVG(ds.search_impression_share) AS avg_impression_share,
        AVG(ds.quality_score) AS avg_quality_score,
        COALESCE(lead_counts.lead_count, 0) AS lead_count
      FROM daily_stats ds
      JOIN keywords k ON k.id = ds.keyword_id
      JOIN ad_groups ag ON ag.id = ds.ad_group_id
      JOIN campaigns c ON c.id = ds.campaign_id
      LEFT JOIN (
        SELECT keyword_id, COUNT(*) AS lead_count
        FROM leads
        WHERE keyword_id IS NOT NULL AND created_at::date BETWEEN $1 AND $2
        GROUP BY keyword_id
      ) lead_counts ON lead_counts.keyword_id = k.id
      WHERE ds.date BETWEEN $1 AND $2 ${campaignFilter}
      GROUP BY k.id, k.text, ag.id, ag.name, c.id, c.name, lead_counts.lead_count
      ORDER BY cost_micros DESC
    `;
  } else if (groupBy === "campaign") {
    query = `
      SELECT
        c.id AS campaign_id, c.name AS campaign_name,
        SUM(ds.impressions) AS impressions,
        SUM(ds.clicks) AS clicks,
        SUM(ds.cost_micros) AS cost_micros,
        SUM(ds.conversions) AS conversions,
        SUM(ds.all_conversions) AS all_conversions,
        AVG(ds.search_impression_share) AS avg_impression_share,
        AVG(ds.quality_score) AS avg_quality_score,
        COALESCE(lead_counts.lead_count, 0) AS lead_count
      FROM daily_stats ds
      JOIN campaigns c ON c.id = ds.campaign_id
      LEFT JOIN (
        SELECT campaign_id, COUNT(*) AS lead_count
        FROM leads
        WHERE campaign_id IS NOT NULL AND created_at::date BETWEEN $1 AND $2
        GROUP BY campaign_id
      ) lead_counts ON lead_counts.campaign_id = c.id
      WHERE ds.date BETWEEN $1 AND $2 ${campaignFilter}
      GROUP BY c.id, c.name, lead_counts.lead_count
      ORDER BY cost_micros DESC
    `;
  } else if (groupBy === "date") {
    query = `
      SELECT
        TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
        SUM(ds.impressions) AS impressions,
        SUM(ds.clicks) AS clicks,
        SUM(ds.cost_micros) AS cost_micros,
        SUM(ds.conversions) AS conversions,
        SUM(ds.all_conversions) AS all_conversions,
        AVG(ds.search_impression_share) AS avg_impression_share,
        AVG(ds.quality_score) AS avg_quality_score,
        COALESCE(lead_counts.lead_count, 0) AS lead_count
      FROM daily_stats ds
      LEFT JOIN (
        SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS lead_date, COUNT(*) AS lead_count
        FROM leads
        WHERE created_at::date BETWEEN $1 AND $2
        GROUP BY created_at::date
      ) lead_counts ON lead_counts.lead_date = TO_CHAR(ds.date, 'YYYY-MM-DD')
      WHERE ds.date BETWEEN $1 AND $2 ${campaignFilter}
      GROUP BY TO_CHAR(ds.date, 'YYYY-MM-DD'), lead_counts.lead_count
      ORDER BY TO_CHAR(ds.date, 'YYYY-MM-DD') ASC
    `;
  } else {
    return res.status(400).json({ error: "group_by must be one of: keyword, campaign, date" });
  }

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows.map(withDerivedMetrics));
  } catch (err) {
    console.error("Failed to fetch performance:", err);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

// POST /api/performance/sync -- Sync Google Ads performance data
// This endpoint receives campaign structure and keyword performance from Google Ads
router.post("/sync", async (req, res) => {
  const { rows } = req.body;
  
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: "rows array required" });
  }
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    let campaignsUpserted = 0;
    let adGroupsUpserted = 0;
    let keywordsUpserted = 0;
    let dailyStatsUpserted = 0;
    let leadsAttributed = 0;
    
    // Collect all dates from the sync
    const syncDates = new Set();
    for (const row of rows) {
      syncDates.add(row.stats.date);
    }
    
    for (const row of rows) {
      // Upsert campaign
      await client.query(
        `INSERT INTO campaigns (id, name, status, channel_type, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           status = EXCLUDED.status,
           channel_type = EXCLUDED.channel_type,
           updated_at = NOW()`,
        [row.campaign.id, row.campaign.name, row.campaign.status, row.campaign.channel_type]
      );
      campaignsUpserted++;
      
      // Upsert ad group
      await client.query(
        `INSERT INTO ad_groups (id, campaign_id, name, status, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           campaign_id = EXCLUDED.campaign_id,
           name = EXCLUDED.name,
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [row.ad_group.id, row.ad_group.campaign_id, row.ad_group.name, row.ad_group.status]
      );
      adGroupsUpserted++;
      
      // Upsert keyword
      await client.query(
        `INSERT INTO keywords (id, ad_group_id, text, match_type, status, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET
           ad_group_id = EXCLUDED.ad_group_id,
           text = EXCLUDED.text,
           match_type = EXCLUDED.match_type,
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [row.keyword.id, row.keyword.ad_group_id, row.keyword.text, row.keyword.match_type, row.keyword.status]
      );
      keywordsUpserted++;
      
      // Upsert daily stats
      await client.query(
        `INSERT INTO daily_stats (
           date, campaign_id, ad_group_id, keyword_id,
           impressions, clicks, cost_micros, conversions, all_conversions,
           view_through_conversions, search_impression_share, search_budget_lost_impr_share,
           search_rank_lost_impr_share, search_top_impression_share, search_abs_top_impression_share,
           quality_score, synced_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
         ON CONFLICT (date, keyword_id) DO UPDATE SET
           impressions = EXCLUDED.impressions,
           clicks = EXCLUDED.clicks,
           cost_micros = EXCLUDED.cost_micros,
           conversions = EXCLUDED.conversions,
           all_conversions = EXCLUDED.all_conversions,
           view_through_conversions = EXCLUDED.view_through_conversions,
           search_impression_share = EXCLUDED.search_impression_share,
           search_budget_lost_impr_share = EXCLUDED.search_budget_lost_impr_share,
           search_rank_lost_impr_share = EXCLUDED.search_rank_lost_impr_share,
           search_top_impression_share = EXCLUDED.search_top_impression_share,
           search_abs_top_impression_share = EXCLUDED.search_abs_top_impression_share,
           quality_score = EXCLUDED.quality_score,
           synced_at = NOW()`,
        [
          row.stats.date,
          row.stats.campaign_id,
          row.stats.ad_group_id,
          row.stats.keyword_id,
          row.stats.impressions || 0,
          row.stats.clicks || 0,
          row.stats.cost_micros || 0,
          row.stats.conversions || 0,
          row.stats.all_conversions || 0,
          row.stats.view_through_conversions || 0,
          row.stats.search_impression_share,
          row.stats.search_budget_lost_impr_share,
          row.stats.search_rank_lost_impr_share,
          row.stats.search_top_impression_share,
          row.stats.search_abs_top_impression_share,
          row.stats.quality_score
        ]
      );
      dailyStatsUpserted++;
    }
    
    // Automatic attribution: match leads without keyword_id to daily_stats
    for (const date of syncDates) {
      // Find leads created on this date that have raw_keyword_text and campaign_id but no keyword_id
      const unmatchedLeads = await client.query(
        `SELECT id, raw_keyword_text, campaign_id, created_at
         FROM leads
         WHERE DATE(created_at) = $1
         AND raw_keyword_text IS NOT NULL
         AND raw_keyword_text != ''
         AND campaign_id IS NOT NULL
         AND keyword_id IS NULL`,
        [date]
      );
      
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
          leadsAttributed++;
        }
      }
    }
    
    await client.query("COMMIT");
    
    res.json({
      success: true,
      campaigns_upserted: campaignsUpserted,
      ad_groups_upserted: adGroupsUpserted,
      keywords_upserted: keywordsUpserted,
      daily_stats_upserted: dailyStatsUpserted,
      leads_attributed: leadsAttributed
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to sync performance data:", err);
    res.status(500).json({ error: "Failed to sync performance data" });
  } finally {
    client.release();
  }
});

module.exports = router;
