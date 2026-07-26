# AdTracker Webhook Integration Guide

## Quick Start for Local Testing

1. **Start the API server:**
   ```bash
   cd adtracker/dashboard/api
   node server.js
   ```

2. **Open the test form:**
   - Open `adtracker/test-form.html` in your browser
   - Fill out the form and submit
   - Check the status message for success/error

3. **Test with tracking parameters:**
   - Add URL parameters to test attribution:
   ```
   file:///path/to/test-form.html?gclid=test123&utm_source=google&utm_medium=cpc&utm_term=solar+quote
   ```

## Production Integration

### Step 1: Configure the Webhook Script

Edit `webhook-script.js` and update the configuration:

```javascript
const API_BASE_URL = "https://dgnomads-wcou.vercel.app"; // Your production API URL
const API_USERNAME = "adtracker";
const API_PASSWORD = "password123";
```

### Step 2: Add to Your Landing Page

**Option A: Simple Integration (Recommended)**
```html
<!-- Add this before the closing </body> tag -->
<script src="/path/to/webhook-script.js"></script>
```

**Option B: Inline Integration**
Copy the entire content of `webhook-script.js` and paste it directly into your HTML before `</body>`.

### Step 3: Ensure Your Form Fields Match

The script automatically maps common field names. Ensure your form has at least one of these:

**Required (at least one):**
- `email` or `Email`
- `phone`, `Phone`, or `phoneNumber`

**Optional (for better attribution):**
- `firstName`, `first_name`, or `firstname`
- `lastName`, `last_name`, or `lastname`
- `address` or `fullAddress`
- `zip`, `zipCode`, or `postalCode`
- `leadSource` or `lead_source`
- `keyword`, `keywordText`, or `keyword_text`

### Step 4: Test on Production

1. Deploy the updated webhook script to your landing page
2. Visit your landing page with Google Ads tracking parameters:
   ```
   https://your-landing-page.com?gclid=xxx&utm_source=google&utm_medium=cpc&utm_term=solar+quote
   ```
3. Submit a test lead
4. Check the AdTracker dashboard to see the lead with attribution

## How It Works

1. **Automatic Tracking Detection:**
   - The script automatically detects gclid and UTM parameters from the URL
   - Stores landing page URL for reference

2. **Form Interception:**
   - Intercepts form submissions on your page
   - Extracts form data and maps field names
   - Sends lead data to AdTracker API

3. **Keyword Attribution:**
   - Uses gclid to match to keyword (if available)
   - Falls back to UTM parameters and keyword text matching
   - Case-insensitive and partial matching for better attribution

4. **Status Events:**
   - Dispatches `adtracker:leadSynced` event on success
   - Dispatches `adtracker:leadSyncError` event on failure
   - You can listen to these events for custom handling

## Advanced Usage

### Manual Lead Submission

If you need to send leads manually (e.g., after AJAX form submission):

```javascript
window.AdTracker.sendLead({
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  phone: "555-1234",
  lead_source: "Website",
  raw_keyword_text: "solar quote"
});
```

### Custom Field Mapping

If your form uses non-standard field names, modify the mapping in the script:

```javascript
const mappedData = {
  first_name: leadData.your_custom_field,
  last_name: leadData.your_last_name_field,
  // ... other mappings
};
```

### Event Listeners

```javascript
// Listen for successful sync
window.addEventListener('adtracker:leadSynced', (e) => {
  console.log('Lead synced:', e.detail);
});

// Listen for sync errors
window.addEventListener('adtracker:leadSyncError', (e) => {
  console.error('Sync failed:', e.detail);
});
```

## Troubleshooting

**Lead not appearing in dashboard:**
- Check browser console for errors
- Verify API credentials are correct
- Ensure form has email or phone field
- Check network tab for failed API calls

**Keyword attribution not working:**
- Ensure gclid is present in URL
- Check that keywords are synced in AdTracker
- Verify keyword text matching (case-insensitive)

**CORS errors:**
- Ensure your API allows requests from your domain
- Check Vercel configuration for CORS settings

## Security Notes

- Never expose API credentials in client-side code in production
- Consider using a proxy server for production deployments
- Implement rate limiting on your API endpoint
- Validate and sanitize all incoming data
