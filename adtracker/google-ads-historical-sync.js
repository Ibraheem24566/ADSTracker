// Google Ads Script for Historical Data Sync (April 1st to Present)
// This script fetches all performance data from April 1st, 2024 and syncs to your dashboard
// Run this in Google Ads > Tools & Settings > Bulk Operations > Scripts

function main() {
  const API_URL = 'https://dgnomads-wcou-git-main-dg-nomads.vercel.app'; // Your dashboard API endpoint
  const USERNAME = 'admin'; // Your API username
  const PASSWORD = 'admin'; // Your API password
  
  // Date range: April 1st, 2024 to today
  const startDate = '2024-04-01';
  const endDate = Utilities.formatDate(new Date(), AdsApp.currentAccount().getTimeZone(), 'yyyy-MM-dd');
  
  // GAQL query to fetch campaign, ad group, keyword, and performance data
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.all_conversions,
      metrics.view_through_conversions,
      metrics.search_impression_share,
      metrics.search_top_impression_share
    FROM keyword_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date, campaign.id, ad_group.id, ad_group_criterion.criterion_id
  `;
  
  Logger.log('Starting historical sync from ' + startDate + ' to ' + endDate);
  
  const report = AdsApp.search(query);
  const batchSize = 100; // Send in batches to avoid timeouts
  let batch = [];
  let totalRows = 0;
  let batchesSent = 0;
  
  while (report.hasNext()) {
    const row = report.next();
    
    // Build the row object matching your API structure
    const rowData = {
      campaign: {
        id: row.campaign.id,
        name: row.campaign.name,
        status: row.campaign.status,
        channel_type: 'SEARCH'
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
        search_impression_share: row.metrics.searchImpressionShare,
        search_budget_lost_impr_share: null,
        search_rank_lost_impr_share: null,
        search_top_impression_share: row.metrics.searchTopImpressionShare,
        search_abs_top_impr_share: null,
        quality_score: null
      }
    };
    
    batch.push(rowData);
    totalRows++;
    
    // Send batch when it reaches the limit
    if (batch.length >= batchSize) {
      sendBatch(batch, API_URL, USERNAME, PASSWORD);
      batchesSent++;
      Logger.log(`Sent batch ${batchesSent} (${batch.length} rows). Total rows processed: ${totalRows}`);
      batch = [];
    }
  }
  
  // Send remaining rows
  if (batch.length > 0) {
    sendBatch(batch, API_URL, USERNAME, PASSWORD);
    batchesSent++;
    Logger.log(`Sent final batch ${batchesSent} (${batch.length} rows). Total rows processed: ${totalRows}`);
  }
  
  Logger.log('Historical sync complete! Total rows: ' + totalRows + ', Batches sent: ' + batchesSent);
}

function sendBatch(rows, apiUrl, username, password) {
  const auth = Utilities.base64Encode(`${username}:${password}`);
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Basic ${auth}`
    },
    payload: JSON.stringify({ rows: rows }),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(`${apiUrl}/api/performance/sync`, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      const result = JSON.parse(responseBody);
      Logger.log('Batch sent successfully. ' + JSON.stringify(result));
    } else {
      Logger.log('Error sending batch. Status: ' + responseCode + ', Response: ' + responseBody);
    }
  } catch (e) {
    Logger.log('Exception sending batch: ' + e.toString());
  }
}
