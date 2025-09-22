<?php
// FILE: public/test-telegram.php
header('Content-Type: text/plain; charset=utf-8');

const TOKEN = '8391726593:AAEpHEtpmkp9PZXsxi9NV78-lkQCpm0fQ3w';
const CHAT  = '5021301933';

$CACERT = 'C:\php-8.4.12\extras\ssl\cacert.pem';
$HAS_CACERT = (DIRECTORY_SEPARATOR === '\\' && is_file($CACERT));

$url = "https://api.telegram.org/bot".TOKEN."/sendMessage";
$payload = ['chat_id'=>CHAT, 'text'=>'Test from local PHP ✅', 'parse_mode'=>'HTML'];

$opts = [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
];
// strict first
$ch = curl_init($url);
if ($HAS_CACERT){ $opts[CURLOPT_SSL_VERIFYPEER]=true; $opts[CURLOPT_CAINFO]=$CACERT; }
curl_setopt_array($ch, $opts);
$resp = curl_exec($ch);
$err  = curl_error($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// insecure retry for local dev if cert problem
$insecure = false;
if (($resp === false || stripos((string)$err,'certificate') !== false) && !$HAS_CACERT) {
  $insecure = true;
  $ch2 = curl_init($url);
  $opts[CURLOPT_SSL_VERIFYPEER] = false;
  $opts[CURLOPT_SSL_VERIFYHOST] = 0;
  curl_setopt_array($ch2, $opts);
  $resp2 = curl_exec($ch2);
  $err2  = curl_error($ch2);
  $http2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
  curl_close($ch2);
  if ($resp2 !== false) { $resp=$resp2; $err=$err2; $http=$http2; }
}

var_export(['http'=>$http,'insecure_retry_used'=>$insecure,'curl_error'=>$err,'resp'=>$resp]);
