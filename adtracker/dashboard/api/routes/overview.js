const express = require("express");
const pool = require("../db");

const router = express.Router();

// Thresholds for alerts -- reasonable defaults, adjust to your account size.
const WASTED_SPEND_MIN_COST = 20; // dollars spent with zero matched leads before flagging
const HIGH_COST_PER_LEAD_MULTIPLIER = 2; // flag keywords costing 2x+ the account average
const IMPRESSION_SHARE_LOST_THRESHOLD = 20; // percent lost to budget before flagging

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getPeriodTotals(from, to, campaignId = null) {
  const campaignFilter = campaignId ? 'WHERE ds.date BETWEEN $1 AND $2 AND ds.campaign_id = $3::bigint' : 'WHERE ds.date BETWEEN $1 AND $2';
  const campaignParams = campaignId ? [from, to, campaignId] : [from, to];

  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(ds.impressions), 0) AS impressions,
       COALESCE(SUM(ds.clicks), 0) AS clicks,
       COALESCE(SUM(ds.cost_micros), 0) AS cost_micros,
       COALESCE(SUM(ds.conversions), 0) AS conversions
     FROM daily_stats ds
     ${campaignFilter}`,
    campaignParams
  );

  const stats = rows[0];
  console.log('Overview stats:', stats);

  const leadCampaignFilter = campaignId ? 'WHERE created_at::date BETWEEN $1 AND $2 AND campaign_id = $3::bigint' : 'WHERE created_at::date BETWEEN $1 AND $2';
  const leadCampaignParams = campaignId ? [from, to, campaignId] : [from, to];

  const { rows: leadRows } = await pool.query(
    `SELECT
       COUNT(*) AS total_leads,
       COUNT(*) FILTER (WHERE sold = true) AS sold_leads,
       COUNT(*) FILTER (WHERE sold = false) AS rejected_leads,
       COALESCE(SUM(revenue), 0) AS total_revenue
     FROM leads
     ${leadCampaignFilter}`,
    leadCampaignParams
  );

  const leads = leadRows[0];
  console.log('Overview leads:', leads);

  const cost = Number(stats.cost_micros) / 1_000_000;
  const totalLeads = Number(leads.total_leads);
  const totalRevenue = Number(leads.total_revenue);
  const profit = totalRevenue - cost;
  const impressions = Number(stats.impressions);
  const clicks = Number(stats.clicks);
  const conversions = Number(stats.conversions);

  const result = {
    impressions,
    clicks,
    cost,
    conversions,
    total_leads: totalLeads,
    sold_leads: Number(leads.sold_leads),
    rejected_leads: Number(leads.rejected_leads),
    cost_per_lead: totalLeads > 0 ? cost / totalLeads : 0,
    revenue: totalRevenue,
    profit: profit,
    roi: cost > 0 ? ((profit / cost) * 100) : 0,
    margin: totalRevenue > 0 ? ((profit / totalRevenue) * 100) : 0,
    booking_rate: totalLeads > 0 ? ((Number(leads.sold_leads) / totalLeads) * 100) : 0,
    ctr: impressions > 0 ? (clicks / impressions * 100) : 0,
    avg_cpc: clicks > 0 ? (cost / clicks) : 0,
    cost_per_conversion: conversions > 0 ? (cost / conversions) : 0,
  };

  console.log('Overview result:', result);
  return result;
}

async function getTrend(from, to, campaignId = null) {
  const campaignFilter = campaignId ? 'WHERE ds.date BETWEEN $1 AND $2 AND ds.campaign_id = $3::bigint' : 'WHERE ds.date BETWEEN $1 AND $2';
  const campaignParams = campaignId ? [from, to, campaignId] : [from, to];

  const leadCampaignFilter = campaignId ? 'WHERE created_at::date BETWEEN $1 AND $2 AND campaign_id = $3::bigint' : 'WHERE created_at::date BETWEEN $1 AND $2';
  const leadCampaignParams = campaignId ? [from, to, campaignId] : [from, to];

  const { rows } = await pool.query(
    `SELECT
       ds.date,
       SUM(ds.cost_micros) AS cost_micros,
       SUM(ds.clicks) AS clicks,
       SUM(ds.impressions) AS impressions,
       SUM(ds.conversions) AS conversions,
       COALESCE(lc.lead_count, 0) AS lead_count,
       COALESCE(lr.revenue_sum, 0) AS revenue
     FROM daily_stats ds
     LEFT JOIN (
       SELECT created_at::date AS d, COUNT(*) AS lead_count
       FROM leads ${leadCampaignFilter}
       GROUP BY created_at::date
     ) lc ON lc.d = ds.date
     LEFT JOIN (
       SELECT created_at::date AS d, COALESCE(SUM(revenue), 0) AS revenue_sum
       FROM leads ${leadCampaignFilter}
       GROUP BY created_at::date
     ) lr ON lr.d = ds.date
     ${campaignFilter}
     GROUP BY ds.date, lc.lead_count, lr.revenue_sum
     ORDER BY ds.date ASC`,
    campaignParams
  );

  const trendData = rows.map((r) => {
    const d = new Date(r.date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      cost: Number(r.cost_micros) / 1_000_000,
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
      conversions: Number(r.conversions),
      leads: Number(r.lead_count),
      revenue: Number(r.revenue),
    };
  });

  console.log('Overview trend data:', trendData);
  return trendData;
}

async function getAlerts(from, to, campaignId = null) {
  const alerts = [];

  if (campaignId) {
    const { rows: wasted } = await pool.query(
      `SELECT k.id AS keyword_id, k.text AS keyword_text, c.name AS campaign_name, SUM(ds.cost_micros) AS cost_micros
       FROM daily_stats ds
       JOIN keywords k ON k.id = ds.keyword_id
       JOIN campaigns c ON c.id = ds.campaign_id
       LEFT JOIN leads l ON l.keyword_id = ds.keyword_id AND l.created_at::date BETWEEN $1 AND $2
       WHERE ds.date BETWEEN $1 AND $2 AND ds.campaign_id = $3::bigint
       GROUP BY k.id, k.text, c.name
       HAVING SUM(ds.cost_micros) / 1000000.0 > $4 AND COUNT(l.id) = 0
       ORDER BY SUM(ds.cost_micros) DESC
       LIMIT 10`,
      [from, to, campaignId, WASTED_SPEND_MIN_COST]
    );
    wasted.forEach((r) =>
      alerts.push({
        type: "wasted_spend",
        severity: "high",
        keyword_id: r.keyword_id,
        keyword_text: r.keyword_text,
        campaign_name: r.campaign_name,
        message: `Spent $${(Number(r.cost_micros) / 1_000_000).toFixed(2)} with zero matched leads`,
      })
    );

    const { rows: avgRow } = await pool.query(
      `SELECT
         SUM(ds.cost_micros) / NULLIF(COUNT(DISTINCT l.id), 0) AS avg_cost_per_lead_micros
       FROM daily_stats ds
       LEFT JOIN leads l ON l.keyword_id = ds.keyword_id AND l.created_at::date BETWEEN $1 AND $2
       WHERE ds.date BETWEEN $1 AND $2 AND ds.campaign_id = $3::bigint`,
      [from, to, campaignId]
    );
    const avgCostPerLead = avgRow[0].avg_cost_per_lead_micros
      ? Number(avgRow[0].avg_cost_per_lead_micros) / 1_000_000
      : null;

    if (avgCostPerLead) {
      const { rows: expensive } = await pool.query(
        `SELECT k.id AS keyword_id, k.text AS keyword_text, c.name AS campaign_name,
                SUM(ds.cost_micros) AS cost_micros, COUNT(DISTINCT l.id) AS lead_count
         FROM daily_stats ds
         JOIN keywords k ON k.id = ds.keyword_id
         JOIN campaigns c ON c.id = ds.campaign_id
         LEFT JOIN leads l ON l.keyword_id = ds.keyword_id AND l.created_at::date BETWEEN $1 AND $2
         WHERE ds.date BETWEEN $1 AND $2 AND ds.campaign_id = $3::bigint
         GROUP BY k.id, k.text, c.name
         HAVING COUNT(DISTINCT l.id) > 0
            AND (SUM(ds.cost_micros) / 1000000.0 / COUNT(DISTINCT l.id)) > $4
         ORDER BY (SUM(ds.cost_micros)::float / COUNT(DISTINCT l.id)) DESC
         LIMIT 10`,
        [from, to, campaignId, avgCostPerLead * HIGH_COST_PER_LEAD_MULTIPLIER]
      );
      expensive.forEach((r) => {
        const cpl = Number(r.cost_micros) / 1_000_000 / Number(r.lead_count);
        alerts.push({
          type: "high_cost_per_lead",
          severity: "medium",
          keyword_id: r.keyword_id,
          keyword_text: r.keyword_text,
          campaign_name: r.campaign_name,
          message: `Cost per lead is $${cpl.toFixed(2)}, vs account average of $${avgCostPerLead.toFixed(2)}`,
        });
      });
    }

    const { rows: budgetLost } = await pool.query(
      `SELECT k.id AS keyword_id, k.text AS keyword_text, c.name AS campaign_name,
              AVG(ds.search_budget_lost_impr_share) AS avg_lost
       FROM daily_stats ds
       JOIN keywords k ON k.id = ds.keyword_id
       JOIN campaigns c ON c.id = ds.campaign_id
       WHERE ds.date BETWEEN $1 AND $2 AND ds.search_budget_lost_impr_share IS NOT NULL AND ds.campaign_id = $3::bigint
       GROUP BY k.id, k.text, c.name
       HAVING AVG(ds.search_budget_lost_impr_share) > $4
       ORDER BY AVG(ds.search_budget_lost_impr_share) DESC
       LIMIT 10`,
      [from, to, campaignId, IMPRESSION_SHARE_LOST_THRESHOLD]
    );
    budgetLost.forEach((r) =>
      alerts.push({
        type: "budget_lost_impression_share",
        severity: "medium",
        keyword_id: r.keyword_id,
        keyword_text: r.keyword_text,
        campaign_name: r.campaign_name,
        message: `Losing ${Number(r.avg_lost).toFixed(1)}% of impressions to budget constraints`,
      })
    );
  } else {
    const { rows: wasted } = await pool.query(
      `SELECT k.id AS keyword_id, k.text AS keyword_text, c.name AS campaign_name, SUM(ds.cost_micros) AS cost_micros
       FROM daily_stats ds
       JOIN keywords k ON k.id = ds.keyword_id
       JOIN campaigns c ON c.id = ds.campaign_id
       LEFT JOIN leads l ON l.keyword_id = ds.keyword_id AND l.created_at::date BETWEEN $1 AND $2
       WHERE ds.date BETWEEN $1 AND $2
       GROUP BY k.id, k.text, c.name
       HAVING SUM(ds.cost_micros) / 1000000.0 > $3 AND COUNT(l.id) = 0
       ORDER BY SUM(ds.cost_micros) DESC
       LIMIT 10`,
      [from, to, WASTED_SPEND_MIN_COST]
    );
    wasted.forEach((r) =>
      alerts.push({
        type: "wasted_spend",
        severity: "high",
        keyword_id: r.keyword_id,
        keyword_text: r.keyword_text,
        campaign_name: r.campaign_name,
        message: `Spent $${(Number(r.cost_micros) / 1_000_000).toFixed(2)} with zero matched leads`,
      })
    );

    const { rows: avgRow } = await pool.query(
      `SELECT
         SUM(ds.cost_micros) / NULLIF(COUNT(DISTINCT l.id), 0) AS avg_cost_per_lead_micros
       FROM daily_stats ds
       LEFT JOIN leads l ON l.keyword_id = ds.keyword_id AND l.created_at::date BETWEEN $1 AND $2
       WHERE ds.date BETWEEN $1 AND $2`,
      [from, to]
    );
    const avgCostPerLead = avgRow[0].avg_cost_per_lead_micros
      ? Number(avgRow[0].avg_cost_per_lead_micros) / 1_000_000
      : null;

    if (avgCostPerLead) {
      const { rows: expensive } = await pool.query(
        `SELECT k.id AS keyword_id, k.text AS keyword_text, c.name AS campaign_name,
                SUM(ds.cost_micros) AS cost_micros, COUNT(DISTINCT l.id) AS lead_count
         FROM daily_stats ds
         JOIN keywords k ON k.id = ds.keyword_id
         JOIN campaigns c ON c.id = ds.campaign_id
         LEFT JOIN leads l ON l.keyword_id = ds.keyword_id AND l.created_at::date BETWEEN $1 AND $2
         WHERE ds.date BETWEEN $1 AND $2
         GROUP BY k.id, k.text, c.name
         HAVING COUNT(DISTINCT l.id) > 0
            AND (SUM(ds.cost_micros) / 1000000.0 / COUNT(DISTINCT l.id)) > $3
         ORDER BY (SUM(ds.cost_micros)::float / COUNT(DISTINCT l.id)) DESC
         LIMIT 10`,
        [from, to, avgCostPerLead * HIGH_COST_PER_LEAD_MULTIPLIER]
      );
      expensive.forEach((r) => {
        const cpl = Number(r.cost_micros) / 1_000_000 / Number(r.lead_count);
        alerts.push({
          type: "high_cost_per_lead",
          severity: "medium",
          keyword_id: r.keyword_id,
          keyword_text: r.keyword_text,
          campaign_name: r.campaign_name,
          message: `Cost per lead is $${cpl.toFixed(2)}, vs account average of $${avgCostPerLead.toFixed(2)}`,
        });
      });
    }

    const { rows: budgetLost } = await pool.query(
      `SELECT k.id AS keyword_id, k.text AS keyword_text, c.name AS campaign_name,
              AVG(ds.search_budget_lost_impr_share) AS avg_lost
       FROM daily_stats ds
       JOIN keywords k ON k.id = ds.keyword_id
       JOIN campaigns c ON c.id = ds.campaign_id
       WHERE ds.date BETWEEN $1 AND $2 AND ds.search_budget_lost_impr_share IS NOT NULL
       GROUP BY k.id, k.text, c.name
       HAVING AVG(ds.search_budget_lost_impr_share) > $3
       ORDER BY AVG(ds.search_budget_lost_impr_share) DESC
       LIMIT 10`,
      [from, to, IMPRESSION_SHARE_LOST_THRESHOLD]
    );
    budgetLost.forEach((r) =>
      alerts.push({
        type: "budget_lost_impression_share",
        severity: "medium",
        keyword_id: r.keyword_id,
        keyword_text: r.keyword_text,
        campaign_name: r.campaign_name,
        message: `Losing ${Number(r.avg_lost).toFixed(1)}% of impressions to budget constraints`,
      })
    );
  }

  return alerts;
}

async function getRejectionInsight(from, to, campaignId = null) {
  const campaignFilter = campaignId ? 'AND campaign_id = $3::bigint' : '';
  const campaignParams = campaignId ? [from, to, campaignId] : [from, to];

  const { rows: breakdown } = await pool.query(
    `SELECT rejection_reason, COUNT(*) AS count
     FROM leads
     WHERE sold = false AND rejection_reason IS NOT NULL
       AND created_at::date BETWEEN $1 AND $2 ${campaignFilter}
     GROUP BY rejection_reason
     ORDER BY count DESC`,
    campaignParams
  );

  const keywordCampaignFilter = campaignId ? 'AND l.campaign_id = $3::bigint' : '';
  const keywordCampaignParams = campaignId ? [from, to, campaignId] : [from, to];

  const { rows: byKeyword } = await pool.query(
    `SELECT k.id AS keyword_id, k.text AS keyword_text, c.name AS campaign_name,
            COUNT(*) FILTER (WHERE l.sold = true) AS sold_count,
            COUNT(*) FILTER (WHERE l.sold = false) AS rejected_count
     FROM leads l
     JOIN keywords k ON k.id = l.keyword_id
     JOIN campaigns c ON c.id = l.campaign_id
     WHERE l.created_at::date BETWEEN $1 AND $2 AND l.sold IS NOT NULL ${keywordCampaignFilter}
     GROUP BY k.id, k.text, c.name
     HAVING COUNT(*) FILTER (WHERE l.sold = false) > 0
     ORDER BY COUNT(*) FILTER (WHERE l.sold = false) DESC
     LIMIT 10`,
    keywordCampaignParams
  );

  return {
    breakdown: breakdown.map((r) => ({ reason: r.rejection_reason, count: Number(r.count) })),
    by_keyword: byKeyword.map((r) => ({
      keyword_id: r.keyword_id,
      keyword_text: r.keyword_text,
      campaign_name: r.campaign_name,
      sold_count: Number(r.sold_count),
      rejected_count: Number(r.rejected_count),
    })),
  };
}

// GET /api/overview?from=&to=&campaign_id=
router.get("/", async (req, res) => {
  const { from, to, campaign_id } = req.query;
  
  // If from/to not provided, default to last 7 days
  const currentFrom = from || dateNDaysAgo(7 - 1);
  const currentTo = to || dateNDaysAgo(0);
  
  // Calculate previous period of same length
  const daysDiff = Math.ceil((new Date(currentTo) - new Date(currentFrom)) / (1000 * 60 * 60 * 24));
  const previousFrom = dateNDaysAgo(daysDiff * 2 - 1);
  const previousTo = dateNDaysAgo(daysDiff);

  const campaignId = campaign_id || null;

  console.log('Overview API - current period:', { from: currentFrom, to: currentTo, campaignId });
  console.log('Overview API - previous period:', { from: previousFrom, to: previousTo, campaignId });

  try {
    const [current, previous, trend, alerts, rejectionInsight] = await Promise.all([
      getPeriodTotals(currentFrom, currentTo, campaignId),
      getPeriodTotals(previousFrom, previousTo, campaignId),
      getTrend(currentFrom, currentTo, campaignId),
      getAlerts(currentFrom, currentTo, campaignId),
      getRejectionInsight(currentFrom, currentTo, campaignId),
    ]);

    res.json({
      period: { from: currentFrom, to: currentTo },
      current,
      previous,
      trend,
      alerts,
      rejection_insight: rejectionInsight,
    });
  } catch (err) {
    console.error("Failed to build overview:", err);
    res.status(500).json({ error: "Failed to build overview" });
  }
});

module.exports = router;
