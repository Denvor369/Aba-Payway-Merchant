<?php
require __DIR__ . '/config.php';
require __DIR__ . '/helpers.php';

// ABA PayWay will POST results here. Capture everything for debugging.
$data = $_POST ?: [];
log_line('PUSHBACK POST: ' . json_encode($data));

$status = isset($data['status']) ? (string)$data['status'] : '';
$tranId = isset($data['tran_id']) ? $data['tran_id'] : '';

// Minimal success check (sandbox). Some integrations use '0' for approved.
$success = in_array($status, ['0','APPROVED','Success','success'], true);

if ($success) {
  telegram_notify($config['telegram_bot_token'], $config['telegram_chat_id'], "✅ PayWay Sandbox Success\ntran_id: {$tranId}\nstatus: {$status}");
  // TODO: Mark order as paid in your DB…
  echo 'OK'; // Important to respond 200 OK
} else {
  telegram_notify($config['telegram_bot_token'], $config['telegram_chat_id'], "❌ PayWay Sandbox NOT APPROVED\ntran_id: {$tranId}\nstatus: {$status}");
  http_response_code(200);
  echo 'RECEIVED';
}
