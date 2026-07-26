// Google Ads Script: Keyword-Level Performance Sync
// Add this to your Google Ads account: Tools > Scripts > New script
// Set up to run daily via automated rules or triggers

const API_BASE_URL = "https://dgnomads-wcou-git-main-dg-nomads.vercel.app";
const API_USERNAME = "adtracker";
const API_PASSWORD = "password123";

function main() {
  // Fetch campaign structure and keyword performance
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions,
      metrics.conversions,
      metrics.all_conversions,
      metrics.view_through_conversions,
      ad_group_criterion.quality_info.quality_score,
      segments.date
    FROM keyword_view
    WHERE segments.date DURING YESTERDAY
  `;

  const report = AdsApp.search(query);
  const rows = [];

  while (report.hasNext()) {
    const row = report.next();
    rows.push({
      campaign: {
        id: row.campaign.id,
        name: row.campaign.name,
        status: row.campaign.status,
        channel_type: row.campaign.advertisingChannelType
      },
      ad_group: {
        id: row.adGroup.id,
        campaign_id: row.campaign.id,
        name: row.adGroup.name,
        status: row.adGroup.status
      },
      keyword: {
        id: row.adGroupCriterion.criterionId,
        ad_group_id: row.adGroup.id,
        text: row.adGroupCriterion.keyword.text,
        match_type: row.adGroupCriterion.keyword.matchType,
        status: row.adGroupCriterion.status
      },
      stats: {
        date: row.segments.date,
        campaign_id: row.campaign.id,
        ad_group_id: row.adGroup.id,
        keyword_id: row.adGroupCriterion.criterionId,
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
        cost_micros: row.metrics.costMicros,
        conversions: row.metrics.conversions,
        all_conversions: row.metrics.allConversions,
        view_through_conversions: row.metrics.viewThroughConversions,
        search_impression_share: null, // Prohibited in keyword_view
        search_budget_lost_impr_share: null,
        search_rank_lost_impr_share: null,
        search_top_impression_share: null,
        search_abs_top_impression_share: null,
        quality_score: row.adGroupCriterion.qualityInfo ? row.adGroupCriterion.qualityInfo.qualityScore : null
      }
    });
  }

  if (rows.length === 0) {
    Logger.log("No data to sync");
    return;
  }

  // Send payload to API using Basic Auth
  const auth = Utilities.base64Encode(`${API_USERNAME}:${API_PASSWORD}`);
  
  const response = UrlFetchApp.fetch(`${API_BASE_URL}/api/performance/sync`, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Basic ${auth}`
    },
    payload: JSON.stringify({ rows: rows }),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode !== 200) {
    Logger.log(`Error: ${responseCode}`);
    Logger.log(responseBody);
    throw new Error(`API request failed: ${responseCode}`);
  }

  const result = JSON.parse(responseBody);
  Logger.log(`Sync complete: ${result.campaigns_upserted} campaigns, ${result.ad_groups_upserted} ad groups, ${result.keywords_upserted} keywords, ${result.daily_stats_upserted} daily stats`);
  
  return result;
}
