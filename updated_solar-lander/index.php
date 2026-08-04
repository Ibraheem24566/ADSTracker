<?php
$city = 'Northeast'; // default
$state = 'Northeast'; // default
if (isset($_GET['crid']) && !empty($_GET['crid'])) {
    $crid = trim((string) $_GET['crid']);
    $csvPath = __DIR__ . '/Google_CriteriaID_US.csv';
 
    if (file_exists($csvPath) && ($handle = fopen($csvPath, 'r')) !== false) {
        fgetcsv($handle); // skip header
        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0], $row[1])) continue;
 
            // Normalize: trim whitespace, strip stray \r, strip trailing .0
            $rowId = trim($row[0]);
            $rowId = rtrim($rowId, "\r\n");
            $rowId = preg_replace('/\.0$/', '', $rowId);
 
            if ($rowId === $crid) {
                $city = htmlspecialchars(trim($row[1]), ENT_QUOTES, 'UTF-8');
                if (isset($row[2]) && trim($row[2]) !== '') {
                    $state = htmlspecialchars(trim($row[2]), ENT_QUOTES, 'UTF-8');
                }
                break;
            }
        }
        fclose($handle);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Google tag (gtag.js) --> <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18034741027"></script> <script>   window.dataLayer = window.dataLayer || [];   function gtag(){dataLayer.push(arguments);}   gtag('js', new Date());   gtag('config', 'AW-18034741027'); </script>
    <script type="text/javascript">     (function(c,l,a,r,i,t,y){         c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};         t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;         y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);     })(window, document, "clarity", "script", "xpdkuipr7b"); </script>
    <script src="https://www.youtube.com/iframe_api"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Get Your Quote | Venture Solar</title>
    
    <!-- FONTS -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
    
    <!-- LEAFLET MAP CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />

    <style>
        /* --- CSS VARIABLES --- */
        :root {
            --venture-yellow: #FFE838;
            --venture-blue: #005478;
            --venture-dark: #1a1a1a;
            --venture-teal: #00A99D;
            --cta-hover: #f3dc33;
            --white: #ffffff;
            --light-gray: #f9f9f9;
            --border-radius: 4px;
            --header-height: 80px;
            --shadow: 0 4px 20px rgba(0, 84, 120, 0.15);
            --error-red: #dc3545;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        /* SMOOTH SCROLLING */
        html { scroll-behavior: smooth; overflow-x: hidden; }

        /* SCROLL OFFSET */
        section, #quote-form, #reviews { scroll-margin-top: 100px; }

        body { 
            font-family: 'Open Sans', sans-serif; 
            line-height: 1.6; 
            color: var(--venture-dark); 
            background-color: #fff;
            overflow-x: hidden;
            width: 100%;
            max-width: 100%;
        }
        
        h1, h2, h3, h4, h5 { font-family: 'Montserrat', sans-serif; color: var(--venture-blue); }

        /* --- UTILITIES --- */
        .container { max-width: 1180px; margin: 0 auto; padding: 0 20px; }
        .text-center { text-align: center; }
        .text-blue { color: var(--venture-blue); }
        .hidden { display: none; }
        
        /* BUTTONS */
        .btn {
            display: inline-block;
            background: var(--venture-yellow);
            color: var(--venture-dark);
            padding: 16px 32px;
            font-weight: 800;
            font-family: 'Montserrat', sans-serif;
            text-decoration: none;
            border-radius: var(--border-radius);
            border: none;
            cursor: pointer;
            transition: transform 0.2s, background 0.2s;
            text-transform: uppercase;
            font-size: 1rem;
            letter-spacing: 0.5px;
            width: 100%;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            animation: pulse-light 2s ease-in-out infinite;
            
            /* FIXED: Force text to one line */
            white-space: nowrap;
        }
        .btn:hover { 
            background: var(--cta-hover); 
            transform: translateY(-2px);
            animation: none;
        }
        
        .btn-auto {
            width: auto !important;
            padding: 20px 60px;
            display: inline-block;
        }

        /* FIXED: Mobile Button Sizing */
        @media(max-width: 480px) {
            .btn {
                padding: 16px 10px; /* Reduces side padding to fit text */
                font-size: 0.95rem; 
            }
            .btn-auto {
                padding: 16px 20px;
                width: 100% !important;
            }
        }

        /* --- HEADER --- */
        header { 
            background: var(--white); 
            height: var(--header-height); 
            display: flex; 
            align-items: center; 
            position: sticky; 
            top: 0; 
            z-index: 1001; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.05); 
        }
        .nav-wrapper { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        
        .logo-container { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-icon {
            width: 40px; height: 40px; 
            background: var(--venture-yellow); 
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center;
            font-size: 24px; color: var(--venture-blue);
        }
        .logo-text { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 1.6rem; color: var(--venture-dark); letter-spacing: -1px; line-height: 1; }
        .logo-text span { font-weight: 400; color: var(--venture-dark); }
        
        .nav-links { display: flex; gap: 30px; }
        .nav-links a { text-decoration: none; color: var(--venture-dark); font-weight: 600; font-size: 0.9rem; text-transform: uppercase; transition: color 0.3s; }
        .nav-links a:hover { color: var(--venture-blue); }
        
        .nav-phone { 
            font-weight: 700; 
            color: var(--venture-blue); 
            font-size: 1.2rem; 
            text-decoration: none; 
            display: flex; align-items: center; gap: 8px;
        }
        
        @keyframes pulse-light {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 84, 120, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(0, 84, 120, 0); }
        }
        
        @media(max-width: 768px) {
            .nav-links { display: none; } 
            header { height: 70px; }
            .logo-text { font-size: 1.2rem; }
            .nav-phone {
                background: var(--venture-yellow);
                color: var(--venture-dark);
                padding: 10px 20px;
                border-radius: 25px;
                font-size: 1rem;
                font-weight: 800;
                animation: pulse-light 2s ease-in-out infinite;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            .nav-phone span {
                color: var(--venture-dark) !important;
            }
        }

        /* --- HERO SECTION --- */
        .hero {
            background: linear-gradient(90deg, rgba(0,20,32,0.90) 0%, rgba(0,45,70,0.70) 45%, rgba(0,84,120,0.40) 100%), url('venture-home-hero.webp');
            background-size: cover;
            background-position: center 30%;
            padding: 80px 0 100px;
            color: white;
            position: relative;
        }
        .hero-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            grid-template-rows: auto auto;
            grid-template-areas: "content form" "usp form";
            gap: 0;
            align-items: start;
        }
        .hero-content { grid-area: content; }
        .form-box { grid-area: form; margin-left: 40px; }
        .hero-grid > .usp-list { grid-area: usp; margin-bottom: 0; }
        
        .hero-content h1 { font-size: 3.5rem; line-height: 1.1; margin-bottom: 20px; color: white; }
        .hero-content .subhead { font-size: 1.2rem; color: #f0f0f0; margin-bottom: 35px; font-weight: 400; max-width: 90%; }
        .subhead-mobile { display: none; }
        
        .hero-proof-bar {
            display: flex; align-items: center; gap: 15px; margin-bottom: 25px;
            background: rgba(255,255,255,0.15); padding: 8px 20px; border-radius: 50px; width: fit-content;
            border: 1px solid rgba(255,255,255,0.2);
            text-decoration: none;
            cursor: pointer;
            transition: transform 0.2s, background 0.2s;
        }
        .hero-proof-bar:hover {
            transform: translateY(-2px);
            background: rgba(255,255,255,0.25);
        }
        .hero-proof-bar .badge { background: white; color: var(--venture-blue); font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; }
        .hero-proof-text { font-weight: 700; font-size: 0.95rem; color: var(--venture-yellow); letter-spacing: 0.5px; }

        .usp-list { list-style: none; margin-bottom: 30px; }
        .usp-list li { margin-bottom: 15px; display: flex; align-items: center; font-weight: 600; font-size: 1.1rem; }
        .usp-list li .check { 
            display: inline-flex; justify-content: center; align-items: center;
            width: 26px; height: 26px; 
            background: var(--venture-yellow); color: black; 
            border-radius: 50%; margin-right: 15px; 
            font-size: 16px; font-weight: 900;
        }
        
        .form-box {
            background: var(--white);
            padding: 40px;
            border-radius: 6px;
            box-shadow: 0 30px 60px rgba(0,0,0,0.4);
            position: relative;
            color: var(--venture-dark);
            border-top: 8px solid var(--venture-yellow);
        }
        .form-header h3 { font-size: 1.8rem; margin-bottom: 5px; color: var(--venture-blue); }
        .form-header p { font-size: 1rem; color: #666; margin-bottom: 25px; }
        
        .form-control {
            width: 100%; padding: 16px; margin-bottom: 15px;
            border: 1px solid #ccc; background: #fff;
            border-radius: 4px; font-size: 1rem; color: #333;
            transition: border 0.3s, box-shadow 0.3s;
        }
        .form-control:focus { outline: none; border-color: var(--venture-blue); box-shadow: 0 0 0 2px rgba(0,84,120,0.1); }
        
        /* Desktop select dropdown styling with visible caret */
        select.form-control {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23005478' d='M8 11L3 5h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
            background-size: 16px;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            padding-right: 45px;
            cursor: pointer;
        }
        
        @media(max-width: 768px) {
            .form-control {
                font-size: 1.1rem;
                padding: 18px 16px;
                font-weight: 600;
                color: #222;
                height: 56px;
            }
            select.form-control {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 16px center;
                background-size: 12px;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
            }
        }
        
        .input-error {
            border-color: var(--error-red) !important;
            box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25) !important;
            animation: shake 0.3s ease-in-out;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        .field-wrapper { margin-bottom: 15px; }
        .field-wrapper .form-control { margin-bottom: 4px; }
        .error-msg {
            display: block;
            color: var(--error-red);
            font-size: 0.8rem;
            min-height: 1em;
        }

        @media(max-width: 900px) {
            .hero { padding: 20px 0 100px; }
            .hero-grid {
                grid-template-columns: 1fr;
                grid-template-rows: auto auto auto;
                grid-template-areas: "content" "form" "usp";
                gap: 0;
            }
            .hero-content { text-align: center; margin-bottom: 0; }
            .hero-proof-bar { margin: 0 auto 25px; justify-content: center; }
            .usp-list { display: inline-block; text-align: left; margin-bottom: 0; }
            .hero-content h1 { font-size: 2.3rem; line-height: 1.1; margin-bottom: 10px; }
            .hero-content .subhead { max-width: 100%; margin-bottom: 20px; font-size: 1rem; }
            .subhead-desktop { display: none; }
            .subhead-mobile { display: block; font-weight: 700; font-size: 1.3rem; color: var(--venture-yellow); }
            .form-box { padding: 20px; margin-bottom: 20px; margin-left: 0; }
            .form-header h3 { font-size: 1.2rem; margin-bottom: 20px; }
            .form-header p { display: none; }
            .section-title { font-size: 2.3rem; line-height: 1.1; }
            .problem-content h2 { font-size: 2.3rem; line-height: 1.1; }
            .final-cta h2 { font-size: 2.3rem; line-height: 1.1; }
        }

        /* --- PROBLEM SECTION --- */
        .problem-section {
            background-color: var(--venture-blue);
            color: white;
            padding: 80px 0;
            position: relative;
            overflow: hidden;
        }
        .problem-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            align-items: center;
        }
        .problem-content h2 { color: white; font-size: 2.5rem; margin-bottom: 20px; line-height: 1.2; }
        .problem-content p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 30px; }
        .problem-visual img {
            width: 100%;
            height: 400px;
            object-fit: cover;
            border-radius: 8px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            border: 4px solid rgba(255,255,255,0.1);
        }
        @media(max-width: 900px) {
            .problem-grid { grid-template-columns: 1fr; }
            .problem-content { text-align: center; order: 2; }
            .problem-visual { order: 1; }
        }

        /* --- VIDEO SECTION --- */
        .video-section { padding: 90px 0; background: var(--light-gray); }
        .video-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
        }
        .video-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--shadow);
        }
        .video-wrapper {
            position: relative;
            width: 100%;
            padding-top: 56.25%; /* 16:9 */
            background: #000;
        }
        .video-wrapper iframe {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            border: 0;
        }
        .video-card {
            position: relative;
        }
        .video-card-label {
            padding: 20px 24px;
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            color: var(--venture-blue);
            font-size: 1.05rem;
        }
        @media(max-width: 900px) {
            .video-grid { grid-template-columns: 1fr; gap: 30px; }
        }

        /* --- BENEFITS SECTION --- */
        .benefits-section { padding: 100px 0; background: white; }
        .benefits-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 50px;
            margin-top: 50px;
        }
        .benefit-card { text-align: center; }
        .benefit-icon {
            font-size: 3.5rem;
            margin-bottom: 20px;
            color: var(--venture-blue);
            background: #f0f4f7;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;
            margin-right: auto;
        }
        .benefit-card h4 { font-size: 1.5rem; margin-bottom: 15px; color: var(--venture-dark); }
        .benefit-card p { color: #666; font-size: 1rem; line-height: 1.6; }

        /* --- PROCESS SECTION --- */
        .process-section { background-color: #f4f7f9; padding: 100px 0; }
        .process-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; align-items: center; }
        .process-visual img {
            width: 100%;
            border-radius: 12px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            transform: perspective(1000px) rotateY(5deg);
            transition: transform 0.3s;
        }
        .process-visual img:hover { transform: perspective(1000px) rotateY(0deg); }
        .process-steps { list-style: none; margin-top: 30px; }
        .process-step { display: flex; gap: 20px; margin-bottom: 30px; }
        .step-number {
            width: 50px; height: 50px; background: var(--venture-yellow); color: var(--venture-blue);
            border-radius: 50%; font-weight: 800; font-size: 1.5rem;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .step-content h4 { font-size: 1.3rem; margin-bottom: 5px; color: var(--venture-blue); }
        .step-content p { color: #555; }
        @media(max-width: 900px) {
            .process-grid { grid-template-columns: 1fr; }
            .process-visual { order: 2; margin-top: 40px; }
            .process-visual img { transform: none; }
        }

        /* --- WHY US (Infinite Carousel) --- */
        .why-us-section { 
            padding: 100px 0; 
            background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
            overflow: hidden; 
            width: 100%;
            max-width: 100%;
        }
        .section-title { font-size: 2.5rem; margin-bottom: 15px; text-align: center; color: var(--venture-blue); font-weight: 800; }
        .section-subtitle { color: #666; max-width: 700px; margin: 0 auto 60px; text-align: center; font-size: 1.1rem; line-height: 1.6; }
        
        .why-carousel-container {
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            position: relative;
            padding: 20px 0;
        }
        .why-carousel-container::before { content: ""; position: absolute; top: 0; left: 0; width: 100px; height: 100%; z-index: 2; background: linear-gradient(to right, white, transparent); pointer-events: none; }
        .why-carousel-container::after { content: ""; position: absolute; top: 0; right: 0; width: 100px; height: 100%; z-index: 2; background: linear-gradient(to left, white, transparent); pointer-events: none; }

        /* FIXED: GPU Acceleration for Mobile Animation */
        .why-track { 
            display: flex; 
            gap: 30px; 
            width: max-content; 
            animation: marquee 50s linear infinite;
            transform: translateZ(0); 
            will-change: transform;
        }
        
        /* FIXED: Hover pause only on desktop */
        @media (hover: hover) {
            .why-track:hover { animation-play-state: paused; }
        }

        .why-card {
            width: 320px; height: 380px; background: white; border-radius: 12px; padding: 35px 25px;
            text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #eee;
            flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .why-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0, 84, 120, 0.15); border-color: var(--venture-yellow); }
        
        .why-icon-box {
            width: 80px; height: 80px; background: rgba(255, 232, 56, 0.15); border-radius: 50%;
            display: flex; align-items: center; justify-content: center; margin-bottom: 25px; font-size: 32px; color: var(--venture-blue);
        }
        .why-icon-box img { width: 60%; height: auto; object-fit: contain; }

        .why-card h4 { font-size: 1.3rem; color: var(--venture-blue); margin-bottom: 15px; font-weight: 800; line-height: 1.3; }
        .why-card p { font-size: 0.95rem; color: #666; line-height: 1.6; }

        /* --- LOCATIONS & MAP --- */
        .map-wrapper { background: #fff; position: relative; margin-bottom: 0; }

        /* --- STATES SERVED --- */
        .states-section { background: var(--light-gray); padding: 70px 0; }
        .states-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            max-width: 980px;
            margin: 40px auto 0;
        }
        .state-chip {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: white;
            border: 2px solid #e5e5e5;
            border-radius: 8px;
            padding: 18px 20px;
            text-decoration: none;
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            color: var(--venture-blue);
            transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .state-chip .pin { color: var(--venture-yellow); font-size: 1.1rem; filter: drop-shadow(0 0 1px rgba(0,0,0,0.3)); }
        .state-chip:hover {
            transform: translateY(-3px);
            border-color: var(--venture-yellow);
            box-shadow: 0 8px 20px rgba(0, 84, 120, 0.12);
        }
        @media(max-width: 768px) {
            .states-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .state-chip { padding: 14px 16px; font-size: 0.9rem; }
            .state-chip .pin { font-size: 1rem; }
        }
        .map-header-bar { background: linear-gradient(90deg, #6ADEA6 0%, #F8E74E 100%); padding: 15px 0; text-align: center; cursor: pointer; }
        .map-header-text { font-family: 'Montserrat', sans-serif; font-weight: 700; color: var(--venture-blue); font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .map-content-grid { display: grid; grid-template-columns: 1fr 2fr; background: #e9e9e9; }
        .locations-list { background: var(--white); padding: 60px 40px; display: flex; flex-direction: column; justify-content: center; }
        .location-item { margin-bottom: 30px; border-left: 4px solid var(--venture-yellow); padding-left: 20px; }
        .location-item h4 { margin-bottom: 5px; font-size: 1.2rem; color: var(--venture-dark); }
        .location-item p { color: #666; font-size: 0.95rem; line-height: 1.6; }
        
        #interactive-map { width: 100%; height: 600px; background: #e5e5e5; z-index: 1; }

        .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large { background-color: rgba(0, 169, 157, 0.6); }
        .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div { background-color: var(--venture-blue); color: white; font-weight: 700; font-family: 'Montserrat', sans-serif; }
        .custom-pin { background-color: var(--venture-teal); border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }

        .install-badge { position: absolute; top: 20px; left: 20px; background: var(--venture-blue); color: white; padding: 20px 30px; border-radius: 4px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); text-align: center; z-index: 1000; border: 2px solid white; pointer-events: none; }
        .install-badge .count { font-size: 2.2rem; font-weight: 900; line-height: 1; display: block; margin-bottom: 5px; }
        .install-badge .label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        @media(max-width: 768px) { #interactive-map { height: 400px; } .install-badge { top: 10px; left: 10px; padding: 10px 15px; } .install-badge .count { font-size: 1.5rem; } }

        /* --- REVIEWS CAROUSEL --- */
        .carousel-section { padding: 0 0 80px 0; background: var(--light-gray); overflow: hidden; width: 100%; max-width: 100%; }
        .carousel-container { width: 100%; max-width: 100%; position: relative; overflow: hidden; }
        
        /* FIXED: GPU Acceleration for Mobile Animation */
        .carousel-track {
            display: flex;
            gap: 30px;
            width: max-content;
            transform: translateZ(0);
        }
        .carousel-track.is-animating {
            animation: marquee 156s linear infinite;
            will-change: transform;
        }
        
        /* FIXED: Hover pause only on desktop */
        @media (hover: hover) {
            .carousel-track:hover { animation-play-state: paused; }
        }

        /* Mobile adjustments - keep animation but fix layout */
        @media(max-width: 768px) {
            .carousel-track.is-animating { animation-duration: 22s; }
            .review-card { min-width: 300px; max-width: 300px; padding: 20px; }
        }

        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .review-card { min-width: 380px; max-width: 380px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); border-top: 4px solid var(--venture-yellow); flex-shrink: 0; display: flex; flex-direction: column; }
        .r-stars { color: #FFB400; margin-bottom: 15px; letter-spacing: 2px; }
        .r-title { font-weight: 800; font-size: 1.1rem; margin-bottom: 10px; color: var(--venture-blue); }
        .r-body { font-size: 0.95rem; color: #555; font-style: italic; margin-bottom: 20px; line-height: 1.6; flex-grow: 1; }
        .r-author { font-weight: 700; color: var(--venture-dark); display: flex; align-items: center; gap: 10px; border-top: 1px solid #eee; padding-top: 15px; }
        .r-avatar-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #eee; }
        .r-avatar-text { width: 40px; height: 40px; background: var(--venture-blue); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; }
        .r-source { font-size: 0.8rem; color: #999; font-weight: 400; margin-left: auto; display: flex; align-items: center; gap: 5px; }
        .r-source img { height: 16px; opacity: 0.6; }

        @media(max-width: 480px) {
            .review-card { min-width: 300px; max-width: 300px; padding: 20px; }
            .r-title { font-size: 1rem; }
            .r-body { font-size: 0.85rem; }
        }

        /* --- FINAL CTA SECTION --- */
        .final-cta {
            background: linear-gradient(135deg, var(--venture-blue) 0%, #003d59 100%);
            color: white;
            padding: 100px 0;
            text-align: center;
            position: relative;
        }
        .final-cta h2 { color: white; font-size: 2.8rem; margin-bottom: 15px; font-weight: 800; }
        .final-cta p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 40px; }
        .small-text { font-size: 0.9rem; opacity: 0.7; margin-top: 20px; font-style: italic; }

        /* --- CREDENTIALS SECTION --- */
        .credentials-section {
            background-color: #222;
            color: #ddd;
            padding: 60px 0;
            border-bottom: 4px solid var(--venture-yellow);
        }
        .cred-title {
            color: white;
            text-align: center;
            font-size: 1.5rem;
            margin-bottom: 40px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .cred-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 40px;
            align-items: center;
            margin-bottom: 40px;
        }
        
        .cred-logo {
            background-color: #fff;
            padding: 10px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 80px;
            width: 180px; /* Fixed width for uniformity */
            transition: transform 0.3s ease;
        }
        
        .cred-logo:hover {
            transform: translateY(-5px);
        }

        .cred-logo img {
            max-height: 100%;
            max-width: 100%;
            object-fit: contain;
        }

        .licenses-box {
            background: #333;
            padding: 20px;
            border-radius: 4px;
            font-size: 0.85rem;
            color: #aaa;
            text-align: center;
            border: 1px solid #444;
            max-width: 800px;
            margin: 0 auto;
        }
        .licenses-list {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
            list-style: none;
            margin-top: 10px;
        }
        .licenses-list li { white-space: nowrap; }

        /* --- FOOTER --- */
        footer { background: #1a1a1a; color: #888; padding: 50px 0; font-size: 0.85rem; }
        .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
        .footer-logo { color: white; font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 1.4rem; margin-bottom: 15px; display: block; }
        .footer-logo span { color: var(--venture-yellow); font-weight: 400; }
        
        .mobile-sticky { display: none; position: fixed; bottom: 0; left: 0; width: 100%; background: white; padding: 15px; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); z-index: 1001; border-top: 2px solid var(--venture-yellow); text-align: center; animation: pulse-light 2s ease-in-out infinite; }
        .mobile-sticky.hidden-bar { display: none !important; }
        @media(max-width: 768px) { 
            .mobile-sticky { display: block; } 
            body { padding-bottom: 80px; } 
            .footer-grid { grid-template-columns: 1fr; }
            .nav-phone .phone-number { display: none; }
        }
    </style>
</head>
<body>

    <!-- Header -->
    <header>
        <div class="container nav-wrapper">
            <a href="#" class="logo-container">
                <div class="logo-icon">☀</div>
                <div class="logo-text">VENTURE<span>SOLAR</span></div>
            </a>
            <nav class="nav-links">
                <a href="#benefits">Why Solar</a>
                <a href="#why-us">Why Us</a>
                <a href="#locations">Locations</a>
                <a href="#reviews">Reviews</a>
            </nav>
            <a href="tel:+18882570098" class="nav-phone">
                <span style="font-size:0.9rem; font-weight:400; color:#666;">Call Us</span><span class="phone-number">: +1 (888) 257-0098</span>
            </a>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container hero-grid">
            <div class="hero-content">
                <a href="#reviews" class="hero-proof-bar">
                    <span class="badge">BBB A+</span>
                    <span class="hero-proof-text" style="margin-left:10px;">Over 1,000 5-Star Reviews</span>
                </a>
                
                <h1>#1 Trusted Solar Installers in <span style="color:var(--venture-yellow);" id="dynamic-location"><?php echo $city; ?></span></h1>
                
                <p class="subhead subhead-desktop">Join thousands of homeowners saving on energy bills with Venture Solar. $0 Down options available.</p>
                <p class="subhead subhead-mobile">$0 Down, Instant Savings</p>
            </div>

            <!-- ANCHOR TARGET FOR SMOOTH SCROLL -->
            <div class="form-box" id="quote-form">
                <div class="form-header text-center">
                    <h3>Get Your Free Solar Quote</h3>
                    <p>See if you qualify for $0 down solar.</p>
                </div>
                <form id="solarForm" action="poster.php" method="POST">
                    <!-- Hidden fields for URL tracking params -->
                    <input type="hidden" name="keyword" id="keyword" value="">
                    <input type="hidden" name="cr_id" id="cr_id" value="">
                    <input type="hidden" name="gclid" id="gclid" value="">
                    <input type="hidden" name="ad_id" id="ad_id" value="">
                    <input type="hidden" name="campaign_id" id="campaign_id" value="">
                    <input type="hidden" name="adset_id" id="adset_id" value="">
                    
                    <div id="step-1">
                        <select class="form-control" id="bill-amount" name="electric_bill" required>
                            <option value="$0 -$50">Monthly Bill: $0 -$50</option>
                            <option value="$51 - $100">Monthly Bill: $51 - $100</option>
                            <option value="$101 - $150">Monthly Bill: $101 - $150</option>
                            <option value="$151 - $250" selected>Monthly Bill: $151 - $250</option>
                            <option value="$251 - $350">Monthly Bill: $251 - $350</option>
                            <option value="$351 - $500">Monthly Bill: $351 - $500</option>
                            <option value="$501 - $750">Monthly Bill: $501 - $750</option>
                            <option value="$751 - $1000">Monthly Bill: $751 - $1000</option>
                            <option value="$1000+">Monthly Bill: $1000+</option>
                        </select>
                        <select class="form-control" id="homeowner" name="homeowner" required>
                            <option value="Yes">I own my home</option>
                            <option value="No">I rent</option>
                        </select>
                        <select class="form-control" id="roof-shade" name="roof_shade" required>
                            <option value="some shade">Some Shade</option>
                            <option value="mostly shade">Mostly Shade</option>
                            <option value="some sun">Some Sun</option>
                            <option value="mostly sun">Mostly Sun</option>
                            <option value="full sun" selected>No Shade (full sun)</option>
                            <option value="full shade">No Sun (full shade)</option>
                        </select>
                        <button type="button" class="btn" style="background:var(--venture-yellow); color:var(--venture-dark);" onclick="nextStep()">CALCULATE SAVINGS &raquo;</button>
                    </div>
                    <div id="step-2" class="hidden">
                        <div class="field-wrapper">
                            <input type="text" class="form-control" id="full-name" name="full_name" placeholder="Full Name" required>
                            <span class="error-msg" id="name-error"></span>
                        </div>
                        <div class="field-wrapper">
                            <input type="tel" class="form-control" id="phone" name="phone" placeholder="Phone Number" required>
                            <span class="error-msg" id="phone-error"></span>
                        </div>
                        <div class="field-wrapper">
                            <input type="email" class="form-control" id="email" name="email" placeholder="Email Address" required>
                            <span class="error-msg" id="email-error"></span>
                        </div>
                        <div class="field-wrapper">
                            <input type="text" class="form-control" id="zip" name="zip" placeholder="Zip Code" pattern="[0-9]{3,5}" maxlength="5" required>
                            <span class="error-msg" id="zip-error"></span>
                        </div>
                        <button type="submit" class="btn">Get My Free Quote</button>
                        <p style="font-size:0.75rem; color:#999; margin-top:15px; text-align:center;">By clicking, you agree to our <a href="terms.php" style="color:#005478; text-decoration:underline;">Terms</a> & <a href="privacy.php" style="color:#005478; text-decoration:underline;">Privacy Policy</a>.</p>
                    </div>
                </form>
            </div>

            <ul class="usp-list">
                <li><span class="check">✓</span> Ranked #1 Solar Installer in the Northeast</li>
                <li><span class="check">✓</span> Full 25-Year Warranty (Labor, Parts, Roof)</li>
                <li><span class="check">✓</span> No Subcontractors - We Do It All In-House</li>
                <li><span class="check">✓</span> Tesla Powerwall Certified Installer</li>
                <li><span class="check">✓</span> Installation completed in 1 day</li>
            </ul>
        </div>
    </section>

    <!-- REVIEWS SECTION -->
    <div id="reviews">
        <!-- VIDEOS (Installation Walkthrough) -->
        <section class="video-section">
            <div class="container">
                <h2 class="section-title text-center">Don't Just Take Our Word For It</h2>
                <p class="text-center" style="color:#666; margin-bottom:40px;">Hundreds of Real 5-Star Reviews from Google, BBB, and SolarReviews</p>
                <div class="video-grid">
                    <div class="video-card">
                        <div class="video-wrapper">
                            <iframe id="video1" src="https://www.youtube-nocookie.com/embed/l6JKrwBvLIo?rel=0&modestbranding=1&controls=1&disablekb=1&fs=0&enablejsapi=1&showinfo=0&iv_load_policy=3&cc_load_policy=1&hl=en&widget_referrer=&playsinline=1" title="Venture Solar Installation Video 1" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; webkit-playsinline" allowfullscreen></iframe>
                        </div>
                    </div>
                    <div class="video-card">
                        <div class="video-wrapper">
                            <iframe id="video2" src="https://www.youtube-nocookie.com/embed/iRDpmQOF7ok?rel=0&modestbranding=1&controls=1&disablekb=1&fs=0&enablejsapi=1&showinfo=0&iv_load_policy=3&cc_load_policy=1&hl=en&widget_referrer=&playsinline=1" title="Venture Solar Installation Video 2" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; webkit-playsinline" allowfullscreen></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- REVIEWS CAROUSEL -->
        <section class="carousel-section">
            <div class="carousel-container">
                <div class="carousel-track" id="reviewTrack"></div>
            </div>
        </section>
    </div>

    <!-- PROBLEM (Energy Prices) -->
    <section class="problem-section">
        <div class="container problem-grid">
            <div class="problem-content">
                <h2>Energy Prices Are At An All Time High...</h2>
                <p>Don't be a victim of rising utility rates. Solar Panels can help you save up to <strong>70% per year</strong> on your Energy Bills.</p>
                <p>Generate, store, and USE your own energy to maximize savings and gain independence from the grid.</p>
                
                <a href="#quote-form" class="btn btn-auto" style="background:var(--venture-yellow); color:var(--venture-dark);">See My Savings</a>
            </div>
            <div class="problem-visual">
                <img src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=800&q=80" alt="Solar Panels on Roof">
            </div>
        </div>
    </section>

    <!-- BENEFITS (Why Invest) -->
    <section id="benefits" class="benefits-section">
        <div class="container">
            <h2 class="section-title text-center">Why Invest In Solar Panels?</h2>
            <p class="section-subtitle">Millions of US residents have already taken advantage of solar. You can too!</p>
            
            <div class="benefits-grid">
                <div class="benefit-card">
                    <div class="benefit-icon">💰</div>
                    <h4>Save Thousands on Costs</h4>
                    <p>Energy prices are rising. Solar can protect your household from price hikes, and in their lifetime (25 years) can save you over $40,000.</p>
                </div>
                <div class="benefit-card">
                    <div class="benefit-icon">🏠</div>
                    <h4>Increase Property Value</h4>
                    <p>Increase the value of your home by investing in the latest solar technology. Solar roof tiles are a smart and attractive solution for any home.</p>
                </div>
                <div class="benefit-card">
                    <div class="benefit-icon">☀️</div>
                    <h4>Make Money From Solar</h4>
                    <p>Through Net Metering, any energy generated that you don't use can be sent back to the grid for credits, essentially earning you money.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- PROCESS (Survey) -->
    <section class="process-section">
        <div class="container">
            <h2 class="section-title text-center" style="margin-bottom:50px;">Learn How Much You Can Save With A Free Survey & Quote</h2>
            <div class="process-grid">
                <div class="process-visual">
                    <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1000" alt="Custom Solar Savings Report on Tablet">
                </div>
                <div class="process-content">
                    <ul class="process-steps">
                        <li class="process-step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h4>Visit Your Property</h4>
                                <p>One of our qualified solar engineers will come out to you to carry out a free no obligation survey of your property.</p>
                            </div>
                        </li>
                        <li class="process-step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h4>Provide Your Quote</h4>
                                <p>Get a detailed quote outlining costs, installation plans, and estimates of potential energy savings tailored to your roof.</p>
                            </div>
                        </li>
                        <li class="process-step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h4>Install Your Solar System</h4>
                                <p>Our team arrives to install your chosen solar system. We show you how it works. Enjoy reductions in energy bills immediately.</p>
                            </div>
                        </li>
                    </ul>
                    <a href="#quote-form" class="btn btn-auto" style="max-width:300px; margin-top:20px;">Get My Free Quote</a>
                </div>
            </div>
        </div>
    </section>

    <!-- WHY US CAROUSEL -->
    <section id="why-us" class="why-us-section">
        <div class="container">
            <h2 class="section-title">The Venture Difference</h2>
            <p class="section-subtitle">We don't just sell solar; we build it. Discover why over 14,000 homeowners in the Northeast have trusted us.</p>
            
            <div class="why-carousel-container">
                <div class="why-track" id="whyTrack"></div>
            </div>
        </div>
    </section>

    <!-- STATES SERVED -->
    <section class="states-section">
        <div class="container text-center">
            <h2 class="section-title">Proudly Serving Homeowners Across the Northeast</h2>
            <p style="color:#666; max-width:600px; margin:0 auto;">Licensed, certified, and installing in-house across 9 states.</p>
            <div class="states-grid">
                <a href="#" class="state-chip"><span class="pin">📍</span> Connecticut</a>
                <a href="#" class="state-chip"><span class="pin">📍</span> Maine</a>
                <a href="#" class="state-chip"><span class="pin">📍</span> Maryland</a>
                <a href="#" class="state-chip"><span class="pin">📍</span> Massachusetts</a>
                <a href="#" class="state-chip"><span class="pin">📍</span> New Hampshire</a>
                <a href="#" class="state-chip"><span class="pin">📍</span> New Jersey</a>
                <a href="#" class="state-chip"><span class="pin">📍</span> New York</a>
                <a href="#" class="state-chip"><span class="pin">📍</span> Pennsylvania</a>
                <a href="#" class="state-chip"><span class="pin">📍</span> Rhode Island</a>
            </div>
        </div>
    </section>

    <!-- LOCATIONS & MAP (LEAFLET) -->
    <section id="locations" class="map-wrapper">
        <div class="map-header-bar">
            <div class="map-header-text">
                Your Neighbors Love Venture Solar <span style="font-size:0.8rem; margin-left:5px;">▲</span>
            </div>
        </div>
        
        <div style="position:relative;">
            <!-- Badge Overlay -->
            <div class="install-badge">
                <div class="logo-icon" style="width:30px; height:30px; font-size:18px; margin:0 auto 10px;">☀</div>
                <span class="count">14,000+</span>
                <span class="label">Installations</span>
            </div>
            
            <!-- THE MAP DIV -->
            <div id="interactive-map"></div>
        </div>
    </section>

    <!-- FINAL CTA SECTION -->
    <section class="final-cta">
        <div class="container">
            <h2>Stop Renting Your Power. Own It.</h2>
            <p>Join 14,000+ happy homeowners in the Northeast who have already switched.</p>
            <!-- FIXED: Added btn-auto class for width correction -->
            <a href="#quote-form" class="btn btn-auto" style="background:var(--venture-yellow); color:var(--venture-dark);">GET MY FREE SAVINGS REPORT</a>
            <p class="small-text">No cost, no obligation. $0 Down options available.</p>
        </div>
    </section>

    <!-- CREDENTIALS SECTION (FIXED VISUALS) -->
    <section class="credentials-section">
        <div class="container">
            <h3 class="cred-title">Fully Licensed, Certified & Insured</h3>
            
            <div class="cred-grid">
                <!-- BBB -->
                <div class="cred-logo">
                    <img src="https://brilliantpos.com/wp-content/uploads/2018/04/bbb-logo-A-rating.png" alt="BBB Accredited A+">
                </div>
                <!-- NABCEP -->
                <div class="cred-logo">
                    <img src="https://www.nabcep.org/wp-content/uploads/2019/03/NABCEP-ACCREDITED-Badge-logo-PVIC-2019-FINAL-alt-01-1920x1920.png" alt="NABCEP Certified">
                </div>
                <!-- UL -->
                <div class="cred-logo">
                    <img src="https://www.sealanddesign.com/wp-content/uploads/2022/12/CS26681737_Resize-images-for-Marks-page_UL_LISTED.png.webp" alt="UL Listed">
                </div>
                <!-- Inc 5000 -->
                <div class="cred-logo">
                    <img src="https://rmcstrategy.com/wp-content/uploads/2023/02/Inc-5000-logo-24277_688x675.png" alt="Inc 5000">
                </div>
            </div>

            <div class="licenses-box">
                <p><strong>Fully Licensed In:</strong></p>
                <ul class="licenses-list">
                    <li>NYC HIC #2031796</li>
                    <li>NJ 13VH10996500</li>
                    <li>CT HIC.0650479</li>
                    <li>MA 197476</li>
                    <li>RI 44068</li>
                    <li>NH 0506C</li>
                </ul>
                <p style="margin-top:15px; font-size:0.8rem; opacity:0.7;">We carry comprehensive General Liability & Workers Compensation Insurance for your peace of mind.</p>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-grid">
                <div><a href="#" class="footer-logo">VENTURE<span>SOLAR</span></a><p>Venture Solar is the premier solar provider in the Northeast.</p></div>
                <div style="text-align: right;">
                    <!-- PHP AUTOMATIC YEAR -->
                    <p style="margin-bottom:10px;">&copy; <?php echo date('Y'); ?> Venture Home Solar LLC.</p>
                    <p>
                        <!-- PHP LINKS -->
                        <a href="privacy.php" style="color:#888;">Privacy Policy</a> | 
                        <a href="terms.php" style="color:#888;">Terms</a> | 
                        <a href="ccpa.php" style="color:#888;">CCPA</a>
                    </p>
                </div>
            </div>
        </div>
    </footer>

    <!-- Mobile Sticky CTA -->
    <div class="mobile-sticky" id="mobile-sticky-bar"><a href="#quote-form" class="btn" id="mobile-cta-btn">Get My Free Quote</a></div>

    <!-- LEAFLET SCRIPTS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>

    <!-- PAGE SCRIPTS -->
    <script>
        // --- 1. DYNAMIC LOCATION ---
        // Location is now set by PHP from crid parameter - no JS override needed

        // --- 2. WHY US CAROUSEL DATA (With Badges) ---
        const whyUsData = [
            { icon: "🏆", title: "Inc. 5000 Honoree", text: "Recognized as one of the fastest-growing private companies in America." },
            { icon: "⭐", title: "NYSERDA Platinum", text: "Awarded 'Platinum Quality Solar Installer' status for consistent excellence." },
            { icon: "🏗️", title: "No Subcontractors", text: "We do 100% of the work in-house. Venture employees only." },
            { icon: "🛡️", title: "25-Year Warranty", text: "Complete coverage on system, labor, parts, and roof penetrations." },
            { icon: "⚡", title: "1-Day Installation", text: "Our efficient crews typically complete installs in a single day." },
            { icon: "📍", title: "Northeast Specialists", text: "Expert navigation of local building codes in NY, CT, NJ, and MA." },
            { icon: "🔋", title: "Tesla Certified", text: "Certified Tesla Powerwall installer for ultimate battery backup." },
            { icon: "🤝", title: "Project Manager", text: "A dedicated PM handles all permits and utility paperwork for you." },
            { icon: "💰", title: "$0 Down Options", text: "Flexible financing including $0 down leases and loans." },
            { icon: "🏡", title: "14,000+ Installs", text: "Join a massive community of neighbors who have already switched." }
        ];

        const whyTrack = document.getElementById('whyTrack');
        whyUsData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'why-card';
            // Simple logic: if text looks like an icon emoji, use text, else img
            card.innerHTML = `<div class="why-icon-box">${item.icon}</div><h4>${item.title}</h4><p>${item.text}</p>`;
            whyTrack.appendChild(card);
        });
        whyTrack.innerHTML += whyTrack.innerHTML; // Duplicate for infinite scroll

        // --- 3. REVIEWS DATA (REAL) ---
        const reviewsData = [
            { name: "Ambrosia Stracklanger", loc: "Google", text: "Best company ever to solar panels. This is the company you should go to. Venture Solar handled the entire project from start to finish.", img: "https://randomuser.me/api/portraits/women/65.jpg" },
            { name: "Paul Bookey", loc: "Google", text: "Venture was a great experience, from the sales team to the install team – all did a great job! Quick and easy process start to finish.", img: "https://randomuser.me/api/portraits/men/32.jpg" },
            { name: "Elizabeth Forte", loc: "Google", text: "I am a new ecstatic customer of venture solar and I highly recommend using this company as a future consideration for solar panels.", img: "https://randomuser.me/api/portraits/women/44.jpg" },
            { name: "Mihai Mos", loc: "Google", text: "A+ from the start. First with their great intelligent and patient presentation made by their agent until the roofing and solar panels were completely installed.", img: "https://randomuser.me/api/portraits/men/11.jpg" },
            { name: "Joseph Silvia", loc: "Google", text: "Install crew did a fantastic job. The team was knowledgeable and the system looks fantastic on our roof.", img: "https://randomuser.me/api/portraits/men/54.jpg" },
            { name: "Ruben E. Acosta", loc: "Google", text: "They did a great job of making sure I was happy with how things were put on the house. I give this group of installers an A+.", img: "https://randomuser.me/api/portraits/men/67.jpg" },
            { name: "John Coperine", loc: "Google", text: "Venture Solar handled the entire project from start to finish and I'm very happy with the performance of the system.", img: "https://randomuser.me/api/portraits/men/86.jpg" },
            { name: "Lola Ataboeva", loc: "Google", text: "The installation was painless and the support has been great from start to being a current customer. Very professional, clean work.", img: "https://randomuser.me/api/portraits/women/22.jpg" },
            { name: "Matthew Terry", loc: "Google", text: "The installers were very professional and explained everything they were doing. Cleaned up everything before leaving.", img: "https://randomuser.me/api/portraits/men/45.jpg" },
            { name: "Jessica P.", loc: "Google", text: "Super happy with our choice. Our electric bill has dropped significantly and the app is fun to watch.", img: "https://randomuser.me/api/portraits/women/90.jpg" },
            { name: "Robert M.", loc: "Google", text: "Five stars for Venture. They did exactly what they promised, on time and on budget.", img: "https://randomuser.me/api/portraits/men/33.jpg" },
            { name: "Jennifer B.", loc: "Google", text: "Smooth process. The panels look sleek and modern, not clunky like some others I've seen.", img: "https://randomuser.me/api/portraits/women/12.jpg" },
            { name: "Kevin S.", loc: "Google", text: "Venture handled all the paperwork with the town and utility. I didn't have to lift a finger.", img: "https://randomuser.me/api/portraits/men/21.jpg" },
            { name: "Amanda D.", loc: "Google", text: "So glad we went solar with Venture. The savings are real and the service was excellent.", img: "https://randomuser.me/api/portraits/women/55.jpg" },
            { name: "Brian L.", loc: "Google", text: "Top notch company. Professional, courteous, and efficient. A+ experience.", img: "https://randomuser.me/api/portraits/men/76.jpg" },
            { name: "Dean Kevlin", loc: "SolarReviews", text: "Venture was Truly Excellent. They were simply superb. So much better than the 5 other companies we went to." },
            { name: "Charles Flint", loc: "SolarReviews", text: "The crew was great. It was snowing and they just kept going until the job was done. I highly recommend them." },
            { name: "Shawn", loc: "SolarReviews", text: "Venture Solar handled the entire project from start to finish and I'm very happy with the performance." },
            { name: "Karen Sell", loc: "SolarReviews", text: "Outstanding company. They walked me through setting up the app to monitor my system's generation." },
            { name: "Chris Magrane", loc: "SolarReviews", text: "Great Solar Installation experience. Quick and easy process start to finish with a 1 day install!" },
            { name: "RD", loc: "SolarReviews", text: "Happily Solar. My electric bill is extremely low and I have a large energy credit going into the fall." },
            { name: "M in Portland", loc: "SolarReviews", text: "Worry-free experience. Everyone I dealt with at Venture Solar was professional and informed." },
            { name: "Paula", loc: "SolarReviews", text: "Solar panels look great. The installation was done in one day. Would not hesitate to recommend Venture Solar." },
            { name: "Caroline Y", loc: "SolarReviews", text: "My panels are discrete and strategically placed. Venture Solar was in touch every step of the way." },
            { name: "Maureen M", loc: "SolarReviews", text: "The installers were amazing, arrived on time and took care of the installation so professionally." },
            { name: "Andrew A", loc: "SolarReviews", text: "Great company and friendly staff… They were very professional. They explained the whole system to me." },
            { name: "Melina S", loc: "SolarReviews", text: "Everyone at Venture Solar was great. From start to finish, they keep you informed of the process." },
            { name: "Chris G", loc: "SolarReviews", text: "I have spent an entire career in customer service... I was completely, and totally impressed from start to finish." },
            { name: "Nada", loc: "SolarReviews", text: "I'm more than pleased with the service and help I received. My husband and I are extremely happy." },
            { name: "Steve Kohn", loc: "SolarReviews", text: "Made the whole process of signing up very easy. The install was flawless." },
            { name: "Derrick J.", loc: "BBB", text: "Excellent service, Paul was very patient and informative on his instructions. The installation crew was efficient." },
            { name: "James B.", loc: "BBB", text: "Everyone was great and I love the experience. The process was explained clearly and executed perfectly." },
            { name: "Shannon M.", loc: "BBB", text: "The installation crew was fantastic. They were polite, worked hard, and cleaned up everything." },
            { name: "Robert T.", loc: "BBB", text: "A+ experience. From the initial quote to the final activation, Venture Solar was professional and transparent." },
            { name: "Susan K.", loc: "BBB", text: "Very happy with our system. The team navigated our difficult HOA requirements with ease." },
            { name: "Michael P.", loc: "BBB", text: "Professional and Efficient Installation. The crew arrived on time and finished ahead of schedule." },
            { name: "Linda R.", loc: "BBB", text: "I was pleasantly surprised that the process from contract signing to installation was so quick." },
            { name: "William D.", loc: "BBB", text: "Excellent customer service. Whenever I had a question, I got a response within hours." },
            { name: "Patricia H.", loc: "BBB", text: "Transparent pricing. No hidden fees or surprises. What they quoted is what we paid." },
            { name: "Thomas C.", loc: "BBB", text: "Great workmanship. The conduit runs are hidden and the panels look perfectly aligned." },
            { name: "Barbara N.", loc: "BBB", text: "Venture Solar made it easy. I'm saving money every month and helping the environment." },
            { name: "Joseph E.", loc: "BBB", text: "Highly rated for a reason. They deliver on their promises. Very satisfied customer." },
            { name: "Margaret W.", loc: "BBB", text: "The sales consultant was knowledgeable and honest. He didn't try to oversell us." },
            { name: "Charles S.", loc: "BBB", text: "Seamless process. They handled all the utility interconnection paperwork for us." },
            { name: "Dorothy V.", loc: "BBB", text: "We love our solar system! Venture Solar was the right choice for our home." }
        ];

        function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }
        shuffleArray(reviewsData);

        // Mobile GPUs cap composited layer texture width (commonly ~4096-8192px).
        // Rendering all 45 reviews x2 (for the seamless loop) produces a track
        // ~28,800px wide on mobile, which exceeds that limit and causes the
        // animated layer to render blank or freeze. Trim the set on small
        // screens so the loop still feels infinite without breaking the GPU layer.
        const isMobileViewport = window.innerWidth <= 768;
        const MOBILE_REVIEW_COUNT = 12;
        const reviewsToRender = isMobileViewport ? reviewsData.slice(0, MOBILE_REVIEW_COUNT) : reviewsData;

        const reviewTrack = document.getElementById('reviewTrack');
        function getInitials(name) { return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase(); }
        function getSourceIcon(source) { if(source === 'Google') return 'https://placehold.co/16x16/4285F4/ffffff?text=G'; if(source === 'BBB') return 'https://placehold.co/16x16/005478/ffffff?text=B'; return 'https://placehold.co/16x16/orange/ffffff?text=S'; }
        function getRandomColor() { const colors = ['#005478', '#00A99D', '#D9534F', '#F0AD4E', '#5BC0DE', '#2C3E50', '#8E44AD']; return colors[Math.floor(Math.random() * colors.length)]; }

        reviewsToRender.forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            let avatarHTML = review.img ? `<img src="${review.img}" alt="${review.name}" class="r-avatar-img">` : `<div class="r-avatar-text" style="background:${getRandomColor()}">${getInitials(review.name)}</div>`;
            card.innerHTML = `<div class="r-stars">★★★★★</div><div class="r-title">"${review.text.split(' ').slice(0, 4).join(' ')}..."</div><p class="r-body">"${review.text}"</p><div class="r-author">${avatarHTML}${review.name}<span class="r-source"><img src="${getSourceIcon(review.loc)}" alt="icon"> ${review.loc}</span></div>`;
            reviewTrack.appendChild(card);
        });
        reviewTrack.innerHTML += reviewTrack.innerHTML;

        // Don't start the marquee animation until it's actually visible.
        // Fixes iOS Safari failing to paint animated layers that start off-screen.
        const carouselContainer = document.querySelector('.carousel-container');
        if (carouselContainer && reviewTrack) {
            const carouselObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        reviewTrack.classList.add('is-animating');
                    }
                });
            }, { threshold: 0.01 });
            carouselObserver.observe(carouselContainer);
        }

        // Safety net: if the tab/app was backgrounded and the layer got dropped,
        // force a reflow when it becomes visible again (same fix your lock/unlock does manually).
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && reviewTrack && reviewTrack.classList.contains('is-animating')) {
                reviewTrack.classList.remove('is-animating');
                void reviewTrack.offsetWidth; // force reflow
                reviewTrack.classList.add('is-animating');
            }
        });

        // --- 4. LEAFLET MAP LOGIC (Clustering) ---
        const map = L.map('interactive-map').setView([40.95, -73.2], 8);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        const markers = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 });

        function addRandomMarkers(lat, lng, count, spread) {
            for (let i = 0; i < count; i++) {
                const rLat = lat + (Math.random() - 0.5) * spread;
                const rLng = lng + (Math.random() - 0.5) * spread;
                const customIcon = L.divIcon({ className: 'custom-pin', iconSize: [12, 12], iconAnchor: [6, 6] });
                const marker = L.marker([rLat, rLng], { icon: customIcon });
                marker.bindPopup(`<b>Venture Solar Install</b><br>System Size: ${Math.floor(Math.random() * 10 + 5)}kW<br>Status: Active`);
                markers.addLayer(marker);
            }
        }

        // Simulate 4000+ points
        addRandomMarkers(40.75, -73.3, 1500, 0.4); // Long Island
        addRandomMarkers(40.58, -74.15, 800, 0.2); // Staten Island/NJ
        addRandomMarkers(41.6, -72.9, 1000, 0.5); // Connecticut
        addRandomMarkers(41.0, -74.0, 900, 0.4); // North Jersey
        addRandomMarkers(42.2, -71.5, 300, 0.6); // Mass

        map.addLayer(markers);
        // Note: No .disable() calls here means standard interaction is active by default.

        // --- 5. FORM LOGIC ---
        
        // Populate hidden fields from URL params on page load
        (function() {
            const params = new URLSearchParams(window.location.search);
            document.getElementById('keyword').value = params.get('kw') || '';
            document.getElementById('cr_id').value = params.get('crid') || '';
            document.getElementById('gclid').value = params.get('gclid') || '';
            document.getElementById('ad_id').value = params.get('adid') || '';
            document.getElementById('campaign_id').value = params.get('campid') || '';
            document.getElementById('adset_id').value = params.get('asid') || '';
        })();

        function nextStep() {
            const billInput = document.getElementById('bill-amount');
            const homeownerInput = document.getElementById('homeowner');
            const roofInput = document.getElementById('roof-shade');
            let isValid = true;
            let firstInvalidField = null;

            const validate = (input) => {
                if (input.value === "") {
                    input.classList.add('input-error');
                    isValid = false;
                    if (!firstInvalidField) firstInvalidField = input;
                } else {
                    input.classList.remove('input-error');
                }
            };

            validate(billInput);
            validate(homeownerInput);
            validate(roofInput);

            if (!isValid) {
                firstInvalidField.focus();
                return;
            }

            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
            document.querySelector('.form-header h3').textContent = "Final Step";
            document.querySelector('.form-header p').textContent = "Where should we email your savings report?";
            setTimeout(() => document.querySelector('#step-2 input').focus(), 100);
        }

        // Validate US phone: 10 or 11 digits (11 must start with 1)
        function isValidUSPhone(phone) {
            const digits = phone.replace(/\D/g, '');
            if (digits.length === 10) return true;
            if (digits.length === 11 && digits[0] === '1') return true;
            return false;
        }

        // Validate name has a space (first + last)
        function isValidFullName(name) {
            return name.trim().indexOf(' ') > 0;
        }

        // Validate zip: 3-5 digits only
        function isValidZip(zip) {
            const digits = zip.replace(/\D/g, '');
            return digits.length >= 3 && digits.length <= 5;
        }

        // Clear error on field change
        ['full-name', 'phone', 'email', 'zip'].forEach(id => {
            document.getElementById(id).addEventListener('input', function() {
                this.classList.remove('input-error');
                const errorId = id === 'full-name' ? 'name-error' : id + '-error';
                document.getElementById(errorId).textContent = '';
            });
        });

        document.getElementById('solarForm').addEventListener('submit', function(e) {
            const nameInput = document.getElementById('full-name');
            const phoneInput = document.getElementById('phone');
            const emailInput = document.getElementById('email');
            const zipInput = document.getElementById('zip');
            let isValid = true;
            let firstInvalidField = null;

            // Clear previous errors
            [nameInput, phoneInput, emailInput, zipInput].forEach(el => el.classList.remove('input-error'));
            document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');

            // Validate name (must have space)
            if (!isValidFullName(nameInput.value)) {
                nameInput.classList.add('input-error');
                document.getElementById('name-error').textContent = 'Please enter first and last name';
                isValid = false;
                if (!firstInvalidField) firstInvalidField = nameInput;
            }

            // Validate phone
            if (!isValidUSPhone(phoneInput.value)) {
                phoneInput.classList.add('input-error');
                document.getElementById('phone-error').textContent = 'Please enter a valid 10-digit US phone number';
                isValid = false;
                if (!firstInvalidField) firstInvalidField = phoneInput;
            }

            // Validate email (browser handles this with type="email")
            if (!emailInput.value || !emailInput.validity.valid) {
                emailInput.classList.add('input-error');
                document.getElementById('email-error').textContent = 'Please enter a valid email address';
                isValid = false;
                if (!firstInvalidField) firstInvalidField = emailInput;
            }

            // Validate zip
            if (!isValidZip(zipInput.value)) {
                zipInput.classList.add('input-error');
                document.getElementById('zip-error').textContent = 'Please enter a valid 3-5 digit zip code';
                isValid = false;
                if (!firstInvalidField) firstInvalidField = zipInput;
            }

            if (!isValid) {
                e.preventDefault();
                firstInvalidField.focus();
                return;
            }

            // Show processing state
            const btn = document.querySelector('button[type="submit"]');
            btn.textContent = "Processing...";
            btn.disabled = true;
        });

        // --- 6. MOBILE STICKY BAR LOGIC ---
        (function() {
            const stickyBar = document.getElementById('mobile-sticky-bar');
            const ctaBtn = document.getElementById('mobile-cta-btn');
            const formSection = document.getElementById('quote-form');
            
            if (!stickyBar || !ctaBtn || !formSection) return;
            
            // Hide bar when CTA is clicked
            ctaBtn.addEventListener('click', function() {
                stickyBar.classList.add('hidden-bar');
            });
            
            // Show/hide bar based on scroll position relative to form
            function checkFormVisibility() {
                const formRect = formSection.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                
                // Hide if form is visible in viewport (with some buffer)
                if (formRect.top < windowHeight - 100 && formRect.bottom > 100) {
                    stickyBar.classList.add('hidden-bar');
                } else {
                    stickyBar.classList.remove('hidden-bar');
                }
            }
            
            window.addEventListener('scroll', checkFormVisibility);
            window.addEventListener('resize', checkFormVisibility);
            checkFormVisibility(); // Initial check
        })();

        // --- 7. PAGE VIEW TRACKING ---
        (function() {
            // Only log once per session
            if (sessionStorage.getItem('view_logged')) return;
            
            setTimeout(function() {
                // Collect page view data
                const viewData = {
                    page_url: window.location.href,
                    query_string: window.location.search,
                    referer: document.referrer || 'direct',
                    screen_width: screen.width,
                    screen_height: screen.height,
                    viewport_width: window.innerWidth,
                    viewport_height: window.innerHeight,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language || navigator.userLanguage,
                    url_params: Object.fromEntries(new URLSearchParams(window.location.search))
                };
                
                // Send to view_stats.php
                fetch('view_stats.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(viewData)
                })
                .then(function(response) {
                    if (response.ok) {
                        sessionStorage.setItem('view_logged', 'true');
                    }
                })
                .catch(function(err) {
                    console.log('View tracking error:', err);
                });
            }, 5000); // 5 second delay
        })();
    </script>
</body>
</html>