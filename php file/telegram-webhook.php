<?php
// FILE: /public/telegram-webhook.php  (optional but recommended)
// PURPOSE: When customer opens t.me/<bot>?start=order_XXXXXX, DM them the FULL order details.

header('Content-Type: application/json; charset=utf-8');

// === EDIT THIS ===
const TELEGRAM_BOT_TOKEN = '8391726593:AAFPFMz5ouewigLT0uXysG2UMtkx_y7unCs';
// =================

function sendMessage($chatId, $text, $extra = []){
  $url = "https://api.telegram.org/bot".TELEGRAM_BOT_TOKEN."/sendMessage";
  $payload = array_merge(['chat_id'=>$chatId,'text'=>$text,'parse_mode'=>'HTML'], $extra);
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload)
  ]);
  $r = curl_exec($ch);
  curl_close($ch);
  return $r;
}

$update = json_decode(file_get_contents('php://input'), true) ?: [];
$msg = $update['message'] ?? ($update['edited_message'] ?? null);
if (!$msg){ echo json_encode(['ok'=>true]); exit; }

$chatId = $msg['chat']['id'] ?? null;
$text   = trim($msg['text'] ?? '');

if ($chatId && strpos($text, '/start') === 0){
  $payload = trim(substr($text, 6));         // everything after "/start "
  $orderId = (strpos($payload, 'order_') === 0) ? substr($payload, 6) : null;

  if ($orderId){
    $file = __DIR__ . '/orders/' . basename($orderId) . '.json';
    if (is_file($file)){
      $o = json_decode(file_get_contents($file), true) ?: [];
      // format items
      $lines = [];
      foreach (($o['items'] ?? []) as $it){
        $title = $it['title'] ?? '';
        $qty   = (int)($it['qty'] ?? 0);
        $price = number_format((float)($it['price'] ?? 0), 2);
        if ($qty>0 && $title!==''){ $lines[] = "• {$title} × {$qty} — \${$price}"; }
      }
      $itemsBlock = implode("\n", $lines);

      $customerText =
        "✅ Thanks for confirming!\nYour Order ID: <b>#{$o['id']}</b>\n\n".
        "<b>Name:</b> " . htmlspecialchars($o['name'], ENT_QUOTES, 'UTF-8') . "\n".
        "<b>Phone:</b> " . htmlspecialchars($o['phone'], ENT_QUOTES, 'UTF-8') . "\n".
        "<b>Province:</b> " . htmlspecialchars($o['provinceLabel'] ?? $o['province'], ENT_QUOTES, 'UTF-8') . "\n".
        ($o['note'] ? "<b>Note:</b> " . htmlspecialchars($o['note'], ENT_QUOTES, 'UTF-8') . "\n" : "").
        "<b>Items:</b>\n" . htmlspecialchars($itemsBlock, ENT_NOQUOTES, 'UTF-8') . "\n\n".
        "<b>Delivery:</b> " . htmlspecialchars($o['delivery'], ENT_QUOTES, 'UTF-8') . "\n".
        "<b>Total:</b> " . htmlspecialchars($o['total'], ENT_QUOTES, 'UTF-8');

      sendMessage($chatId, $customerText);
    } else {
      sendMessage($chatId, "We couldn’t find your order. If you just placed it, please try again in a moment.");
    }
  } else {
    sendMessage($chatId, "👋 Hi! Send /start again from your order link so I can find your details.");
  }

  // Ask to share phone (optional)
  $kb = [
    'keyboard' => [[['text'=>'Share my phone number','request_contact'=>true]]],
    'resize_keyboard'=>true,
    'one_time_keyboard'=>true
  ];
  sendMessage($chatId, 'Tap below to share your phone number (optional):', ['reply_markup'=>$kb]);
}

echo json_encode(['ok'=>true]);
