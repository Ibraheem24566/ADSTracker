<?php
// Ensure logs directory exists
$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

function writeLog($message) {
    global $logDir;
    $logFile = $logDir . '/lead_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND | LOCK_EX);
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    writeLog("ERROR: Non-POST request rejected");
    header('Location: index.php');
    exit;
}

// Collect form data
$fullName = trim($_POST['full_name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$email = trim($_POST['email'] ?? '');
$zip = trim($_POST['zip'] ?? '');
$electricBill = trim($_POST['electric_bill'] ?? '');
$roofShade = trim($_POST['roof_shade'] ?? '');
$homeowner = trim($_POST['homeowner'] ?? '');

// Collect URL tracking params from POST, fallback to GET parameters from referer URL
$refererUrl = $_SERVER['HTTP_REFERER'] ?? '';
$refererParams = [];
if ($refererUrl) {
    $parsedUrl = parse_url($refererUrl);
    if (isset($parsedUrl['query'])) {
        parse_str($parsedUrl['query'], $refererParams);
    }
}

$keyword = trim($_POST['keyword'] ?? $refererParams['kw'] ?? '');
$crId = trim($_POST['cr_id'] ?? $refererParams['crid'] ?? '');
$gclid = trim($_POST['gclid'] ?? $refererParams['gclid'] ?? '');
$adId = trim($_POST['ad_id'] ?? $refererParams['adid'] ?? '');
$campaignId = trim($_POST['campaign_id'] ?? $refererParams['campid'] ?? '');
$adsetId = trim($_POST['adset_id'] ?? $refererParams['adsetid'] ?? '');

// Validation
$errors = [];

// Name must have a space (first + last)
if (empty($fullName) || strpos($fullName, ' ') === false) {
    $errors[] = 'Full name must include first and last name';
}

// Phone: strip non-numeric, must be 10 or 11 digits (11 must start with 1)
$phoneClean = preg_replace('/[^0-9]/', '', $phone);
if (strlen($phoneClean) === 11 && $phoneClean[0] === '1') {
    $phoneClean = substr($phoneClean, 1); // trim leading 1
} elseif (strlen($phoneClean) !== 10) {
    $errors[] = 'Phone must be a valid 10-digit US number';
}

// Email validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email address';
}

// Zip: 3-5 digits only
$zipClean = preg_replace('/[^0-9]/', '', $zip);
if (strlen($zipClean) < 3 || strlen($zipClean) > 5) {
    $errors[] = 'Zip code must be 3-5 digits';
}
// Pad to 5 digits with leading zeros
$zipClean = str_pad($zipClean, 5, '0', STR_PAD_LEFT);

// Electric bill required
if (empty($electricBill)) {
    $errors[] = 'Electric bill selection required';
}

// Roof shade required
if (empty($roofShade)) {
    $errors[] = 'Roof shade selection required';
}

if (!empty($errors)) {
    writeLog("VALIDATION ERROR: " . implode(', ', $errors) . " | Data: name=$fullName, phone=$phone, email=$email, zip=$zip");
    // Redirect back with error (in production, you'd want to preserve form data)
    header('Location: index.php?error=1');
    exit;
}

// Split name into first and last
$nameParts = explode(' ', $fullName, 2);
$firstName = $nameParts[0];
$lastName = isset($nameParts[1]) ? $nameParts[1] : '';

// Lookup city and state from uszips.csv
$city = 'Unknown';
$state = 'Unknown';
$csvFile = __DIR__ . '/uszips.csv';
if (($handle = fopen($csvFile, 'r')) !== false) {
    fgetcsv($handle); // skip header (city,state,zip5digit)
    while (($row = fgetcsv($handle)) !== false) {
        if (isset($row[2]) && $row[2] === $zipClean) {
            $city = $row[0];
            $state = $row[1];
            break;
        }
    }
    fclose($handle);
}

// Load target coverage zips: zip-set + (city|state) -> first matching target zip
$targetZipSet = [];
$targetByCityState = [];
$targetZipsFile = __DIR__ . '/target-zips.csv';
if (($handle = fopen($targetZipsFile, 'r')) !== false) {
    fgetcsv($handle); // skip header (zip_code,city,state)
    while (($row = fgetcsv($handle)) !== false) {
        if (empty($row[0])) continue;
        $tZip = trim($row[0]);
        $targetZipSet[$tZip] = true;
        if (!empty($row[1]) && !empty($row[2])) {
            $key = strtolower(trim($row[1])) . '|' . strtoupper(trim($row[2]));
            if (!isset($targetByCityState[$key])) {
                $targetByCityState[$key] = $tZip;
            }
        }
    }
    fclose($handle);
}

// Determine coverage and apply zip substitution if applicable
$postZip = $zipClean;
$inCoverage = isset($targetZipSet[$zipClean]);
if (!$inCoverage && $city !== 'Unknown' && $state !== 'Unknown') {
    $key = strtolower($city) . '|' . strtoupper($state);
    if (isset($targetByCityState[$key])) {
        $postZip = $targetByCityState[$key];
        $inCoverage = true;
        writeLog("ZIP SUBSTITUTION: lead zip $zipClean ($city, $state) not in target list; substituting target zip $postZip from same city/state");
    }
}

// Get IP address
$ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_CLIENT_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
// If multiple IPs (proxy chain), take the first
if (strpos($ipAddress, ',') !== false) {
    $ipAddress = trim(explode(',', $ipAddress)[0]);
}

// Timestamp in ISO 8601 format
$timestamp = date('c');

// Build payload for CRM
$payload = [
    'campaign_id' => '49dd58a1-2f1c-414f-949d-b676ac4dc3e9',
    'publisher_id' => '84d70df9-91af-406d-ba3d-c70383a20886',
    'first_name' => $firstName,
    'last_name' => $lastName,
    'address' => 'na',
    'city' => $city,
    'state' => $state,
    'zip_code' => $postZip,
    'email' => $email,
    'phone' => $phoneClean,
    'roof_shade' => $roofShade,
    'electric_bill' => $electricBill,
    'credit' => 'good',
    'ip_address' => $ipAddress,
    'timestamp' => $timestamp,
    'trusted_form_token' => 'na',
    'source_id' => 'google',
    'S1' => $campaignId,
    'S2' => $adsetId,
    'S3' => $adId,
    'S4' => $keyword
];

writeLog("POSTING LEAD: " . json_encode($payload));

// Post to CRM endpoint
$ch = curl_init('https://alpha.clickpostcall.com/api/v1/post');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-Key: pk_Cp5KFi-A_zJu4kpbowLMin7ol5S-RDEDf2NeGcuK4Qc'
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    writeLog("CURL ERROR: $curlError");
} else {
    writeLog("CRM RESPONSE [$httpCode]: $response");
}

// Post to Dashboard API (isolated from CRM posting above — any failure here is only logged, never disrupts CRM or the redirect flow)
try {
    $dashboardPayload = [
        'name' => $fullName,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'full_address' => "$city, $state $postZip",
        'zip_code' => $postZip,
        'lead_source' => 'google',
        'status' => 'Contacted',
        'created_at' => $timestamp
    ];

    // Only include numeric/tracking fields if they're actually numeric (avoids bigint cast errors)
    if ($gclid !== '') {
        $dashboardPayload['gclid'] = $gclid;
        $dashboardPayload['click_id'] = $gclid;
    }
    if ($keyword !== '') {
        $dashboardPayload['raw_keyword_text'] = $keyword;
    }
    if ($crId !== '') {
        $dashboardPayload['criteria_id'] = $crId;
    }
    if ($campaignId !== '' && ctype_digit($campaignId)) {
        $dashboardPayload['campaign_id'] = $campaignId;
    }
    if ($adsetId !== '' && ctype_digit($adsetId)) {
        $dashboardPayload['ad_group_id'] = $adsetId;
    }
    // Skip keyword_id - it requires a valid foreign key in the keywords table

    writeLog("POSTING TO DASHBOARD: " . json_encode($dashboardPayload));

    $dashboardCh = curl_init('https://ads-tracker-delta.vercel.app/api/leads');
    curl_setopt_array($dashboardCh, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($dashboardPayload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Basic ' . base64_encode('admin:LFG24566@.')
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30
    ]);

    $dashboardResponse = curl_exec($dashboardCh);
    $dashboardHttpCode = curl_getinfo($dashboardCh, CURLINFO_HTTP_CODE);
    $dashboardCurlError = curl_error($dashboardCh);
    curl_close($dashboardCh);

    if ($dashboardCurlError) {
        writeLog("DASHBOARD CURL ERROR (non-fatal, lead already sent to CRM): $dashboardCurlError");
    } elseif ($dashboardHttpCode >= 400) {
        writeLog("DASHBOARD RESPONSE [$dashboardHttpCode] (non-fatal, lead already sent to CRM): $dashboardResponse");
        
        // If foreign key error, retry without campaign_id and ad_group_id
        if ($dashboardHttpCode === 500 && strpos($dashboardResponse, 'foreign key constraint') !== false) {
            writeLog("DASHBOARD FOREIGN KEY ERROR - Retrying without campaign_id and ad_group_id");
            
            $retryPayload = $dashboardPayload;
            unset($retryPayload['campaign_id']);
            unset($retryPayload['ad_group_id']);
            
            writeLog("DASHBOARD RETRY PAYLOAD: " . json_encode($retryPayload));
            
            $retryCh = curl_init('https://ads-tracker-delta.vercel.app/api/leads');
            curl_setopt_array($retryCh, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($retryPayload),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Basic ' . base64_encode('admin:LFG24566@.')
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30
            ]);
            
            $retryResponse = curl_exec($retryCh);
            $retryHttpCode = curl_getinfo($retryCh, CURLINFO_HTTP_CODE);
            $retryCurlError = curl_error($retryCh);
            curl_close($retryCh);
            
            if ($retryCurlError) {
                writeLog("DASHBOARD RETRY CURL ERROR: $retryCurlError");
            } else {
                writeLog("DASHBOARD RETRY RESPONSE [$retryHttpCode]: $retryResponse");
            }
        }
    } else {
        writeLog("DASHBOARD RESPONSE [$dashboardHttpCode]: $dashboardResponse");
    }
} catch (\Throwable $e) {
    // Catch-all: any unexpected error in dashboard posting is logged only, never disrupts CRM posting or the redirect below
    writeLog("DASHBOARD EXCEPTION (non-fatal, lead already sent to CRM): " . $e->getMessage());
}

// Build redirect URL preserving crid for thank you page
$redirectUrl = $inCoverage ? 'thankyou.php' : 'thankyou-ooc.php';
if (!empty($crId)) {
    $redirectUrl .= '?crid=' . urlencode($crId);
}

header('Location: ' . $redirectUrl);
exit;
