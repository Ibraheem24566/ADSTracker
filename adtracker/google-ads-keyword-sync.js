// Google Ads Script for Keyword Structure Sync (No Performance Data)
// This script fetches only campaign, ad group, and keyword structure for lead attribution
// Run this in Google Ads > Tools & Settings > Bulk Operations > Scripts

function main() {
  const API_URL = 'https://dgnomads-wcou-git-main-dg-nomads.vercel.app'; // Your dashboard API endpoint
  const USERNAME = 'admin'; // Your API username
  const PASSWORD = 'admin'; // Your API password
  
  // GAQL query to fetch campaign, ad group, and keyword structure only
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.campaign_id,
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status
    FROM keyword_view
  `;
  
  Logger.log('Starting keyword structure sync...');
  
  const report = AdsApp.search(query);
  const rows = [];
  const campaigns = new Set();
  const adGroups = new Set();
  const keywords = new Set();
  
  while (report.hasNext()) {
    const row = report.next();
    
    const campaignId = row.campaign.id;
    const adGroupId = row.adGroup.id;
    const keywordId = row.adGroupCriterion.criterionId;
    
    // Track unique entities
    campaigns.add(campaignId);
    adGroups.add(adGroupId);
    keywords.add(keywordId);
    
    rows.push({
      campaign: {
        id: campaignId,
        name: row.campaign.name,
        status: row.campaign.status,
        channel_type: row.campaign.advertisingChannelType
      },
      ad_group: {
        id: adGroupId,
        campaign_id: row.adGroup.campaignId,
        name: row.adGroup.name,
        status: row.adGroup.status
      },
      keyword: {
        id: keywordId,
        ad_group_id: adGroupId,
        text: row.adGroupCriterion.keyword.text,
        match_type: row.adGroupCriterion.keyword.matchType,
        status: row.adGroupCriterion.status
      },
      stats: null // No performance data needed
    });
  }
  
  Logger.log(`Found ${campaigns.size} campaigns, ${adGroups.size} ad groups, ${keywords.size} keywords`);
  
  if (rows.length === 0) {
    Logger.log("No data to sync");
    return;
  }
  
  // Send payload to API using Basic Auth
  const auth = Utilities.base64Encode(`${USERNAME}:${PASSWORD}`);
  
  const response = UrlFetchApp.fetch(`${API_URL}/api/performance/sync`, {
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
  Logger.log(`Sync complete: ${result.campaigns_upserted} campaigns, ${result.ad_groups_upserted} ad groups, ${result.keywords_upserted} keywords`);
  
  return result;
}
