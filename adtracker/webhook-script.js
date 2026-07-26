// AdTracker Lead Capture Webhook Script
// Add this script to your landing pages to automatically sync leads to AdTracker
// Place this before the closing </body> tag

(function() {
  const API_BASE_URL = "YOUR_API_URL_HERE"; // e.g., https://dgnomads-wcou.vercel.app or http://localhost:3002
  const API_USERNAME = "YOUR_USERNAME";
  const API_PASSWORD = "YOUR_PASSWORD";

  // Auto-detect gclid and UTM parameters from URL
  function getTrackingParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      gclid: urlParams.get('gclid'),
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      landing_page: window.location.href
    };
  }

  // Send lead data to AdTracker API
  function sendLeadToAdTracker(leadData) {
    const trackingParams = getTrackingParams();
    
    const payload = {
      ...leadData,
      ...trackingParams,
      created_date: new Date().toISOString()
    };

    const auth = btoa(`${API_USERNAME}:${API_PASSWORD}`);

    fetch(`${API_BASE_URL}/api/leads/create-from-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Lead synced to AdTracker:', data);
      // Dispatch custom event for other scripts to listen
      window.dispatchEvent(new CustomEvent('adtracker:leadSynced', { detail: data }));
    })
    .catch(error => {
      console.error('Failed to sync lead to AdTracker:', error);
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('adtracker:leadSyncError', { detail: error }));
    });
  }

  // Intercept form submissions
  function interceptForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        // Get form data
        const formData = new FormData(form);
        const leadData = {};
        
        formData.forEach((value, key) => {
          leadData[key] = value;
        });

        // Map common field names to expected API fields
        const mappedData = {
          crm_lead_id: leadData.leadId || leadData.lead_id || null,
          first_name: leadData.firstName || leadData.first_name || leadData.firstname || null,
          last_name: leadData.lastName || leadData.last_name || leadData.lastname || null,
          email: leadData.email || leadData.Email || null,
          phone: leadData.phone || leadData.Phone || leadData.phoneNumber || leadData.phone_number || null,
          full_address: leadData.address || leadData.fullAddress || leadData.full_address || null,
          zip_code: leadData.zip || leadData.zipCode || leadData.zip_code || leadData.postalCode || leadData.postal_code || null,
          lead_source: leadData.leadSource || leadData.lead_source || 'Website',
          raw_keyword_text: leadData.keyword || leadData.keywordText || leadData.keyword_text || null,
          web_source_campaign: leadData.webSourceCampaign || leadData.web_source_campaign || null
        };

        // Only send if we have email or phone
        if (mappedData.email || mappedData.phone) {
          sendLeadToAdTracker(mappedData);
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptForms);
  } else {
    interceptForms();
  }

  // Expose function to window for manual calls
  window.AdTracker = {
    sendLead: sendLeadToAdTracker,
    getTrackingParams: getTrackingParams
  };
})();
