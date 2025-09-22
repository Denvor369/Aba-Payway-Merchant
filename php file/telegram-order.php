<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

const TELEGRAM_BOT_TOKEN = '8391726593:AAEpHEtpmkp9PZXsxi9NV78-lkQCpm0fQ3w';
const ADMIN_CHAT_ID      = '5021301933';
const BOT_USERNAME       = 'DarilaaBot';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  http_response_code(204);
  exit;
}
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok'=>false,'error'=>'Method not allowed']);
  exit;
}

$raw = file_get_contents('php://input') ?: '';
$in  = json_decode($raw, true);
if (!is_array($in)) $in = [];

// ---- Pull fields (accept both shapes) ----
$name      = trim((string)($in['name'] ?? ''));
$phone     = trim((string)($in['phone'] ?? ''));
$province  = trim((string)($in['provinceLabel'] ?? $in['province'] ?? ''));
$note      = trim((string)($in['note'] ?? ''));
$delivery  = (string)($in['delivery'] ?? '');
$total     = (string)($in['total'] ?? '0');
$optIn     = !empty($in['tgOptIn']) || !empty($in['telegram_opt_in']);

// items[] OR bag[]
$items = [];
if (!empty($in['items']) && is_array($in['items'])) $items = $in['items'];
elseif (!empty($in['bag']) && is_array($in['bag'])) $items = $in['bag'];

// Minimal validation
if ($name === '' || $phone === '' || count($items) === 0) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'Missing required fields']);
  exit;
}

// Helpers
$esc   = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$money = fn($n) => '$' . number_format((float)preg_replace('/[^\d.\-]/','',(string)$n), 2);

// Build items block
$lines = [];
foreach ($items as $it) {
  $title = $it['title'] ?? ($it['id'] ?? 'Item');
  $qty   = (int)($it['qty'] ?? 0);
  $line  = isset($it['lineTotal']) ? (float)$it['lineTotal'] : ((float)($it['price'] ?? 0) * $qty);
  if ($qty > 0) $lines[] = "• {$esc($title)} × {$qty} — " . $money($line);
}
$itemsBlock = $lines ? implode("\n", $lines) : '—';

$orderId = strtoupper(substr(md5(uniqid('', true)), 0, 6));

// Message (phone in body—Telegram will auto-link on mobile)
$msg  = "🧾 <b>New Order #{$orderId}</b>\n";
$msg .= "<b>Name:</b> {$esc($name)}\n";
$msg .= "<b>Phone:</b> {$esc($phone)}\n";
if ($province !== '') $msg .= "<b>Province:</b> {$esc($province)}\n";
if ($note !== '')     $msg .= "<b>Note:</b> {$esc($note)}\n";
$msg .= "<b>Items:</b>\n{$esc($itemsBlock)}\n\n";
if ($delivery !== '') $msg .= "<b>Delivery:</b> {$esc($delivery)}\n";
$msg .= "<b>Total:</b> {$esc($total)}\n";

// Only safe URL button (no tel:)
$replyMarkup = null;
if ($optIn) {
  $deepLink = "https://t.me/".BOT_USERNAME."?start=order_".$orderId;
  $replyMarkup = ['inline_keyboard' => [[['text'=>'💬 Open Bot (Customer)','url'=>$deepLink]]]];
}

// Telegram helper
function tg(string $method, array $payload): array {
  $url = 'https://api.telegram.org/bot'.TELEGRAM_BOT_TOKEN.'/'.$method;
  $ch  = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_TIMEOUT        => 20,
  ]);
  $resp = curl_exec($ch);
  $err  = curl_error($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return ['http'=>$http,'err'=>$err,'raw'=>$resp,'json'=>json_decode($resp,true)];
}

// Send
$payload = [
  'chat_id'    => ADMIN_CHAT_ID,
  'text'       => $msg,
  'parse_mode' => 'HTML',
];
if ($replyMarkup) $payload['reply_markup'] = $replyMarkup;

$r = tg('sendMessage', $payload);

if (($r['http'] ?? 0) !== 200 || empty($r['json']['ok'])) {
  http_response_code(502);
  echo json_encode(['ok'=>false,'error'=>'Telegram send failed','debug'=>$r]);
  exit;
}

echo json_encode(['ok'=>true,'orderId'=>$orderId]);
