<?php
header("Content-Security-Policy: default-src 'self';");
header("Cross-Origin-Resource-Policy: same-origin;");
header("Cross-Origin-Opener-Policy: same-origin;");
header("Cross-Origin-Embedder-Policy: require-corp;");

// SSL
if (!isset($_SERVER['REMOTE_ADDR']) || !($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1')) {
    if (!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] !== 'on') {
        header($_SERVER['SERVER_PROTOCOL'] . ' 301 Moved Permanently');
        header("Location: https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);
        die();
    }
}

?><!DOCTYPE html>
<html lang="de">
<head>
    <!--
    Hallo! Programmierer? https://www.netas.ch/stellenangebote/ !
    Copyright (c) 2024 Lukas Buchs, netas.ch
    -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔒 Netas Secure Transfer</title>
    <script src="run.js"></script>
    <link rel="stylesheet" type="text/css" href="resources/saveshare.css"/>
</head>
<body>
<div class="container">
    <div class="logo">
        <img src="resources/logo.svg" alt="netas.ch">
    </div>
    <textarea id="textcontent" class="textcontent" placeholder="Text hier eingeben..."></textarea>
    <div class="file-picker">
        <input type="file" id="fileInput" multiple>
    </div>
    <div class="file-display" id="fileDisplay"></div>
    <div class="form">
        <label>Anzahl Öffnungen<br/><input type="range" name="openings" min="1" max="21" value="1">&nbsp;<span
                    id="openingsVal">1x</span></label><br/><br/>
        <label>Löschen nach<br/><input type="range" name="days" min="1" max="60" value="7">&nbsp;<span id="rangeVal">7 Tage</span></label><br/><br/>
        <label><input type="radio" name="type" value="url" checked/> URL</label><br/>
        <label><input type="radio" name="type" value="url+code"/> URL & Code</label><br/>
        <button id="upload">Hochladen</button>
    </div>
    <div class="footer">
        by <a href="https://www.netas.ch" target="_blank">netas.ch</a>&nbsp;|&nbsp;<a href="https://github.com/netas-ch/secure-share" target="_blank">open source</a>
    </div>
</div>
</body>
</html>

