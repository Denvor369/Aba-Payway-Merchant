// server.js — Express server for PayWay (sandbox) + Telegram orders (ESM)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import { attachTelegramOrderRoutes } from './server.telegram.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// --- ENV ---
const {
  PAYWAY_MERCHANT_ID,
  PAYWAY_API_KEY,
  PAYWAY_RETURN_URL = 'http://localhost:3000/payway/callback',
  PAYWAY_CANCEL_URL = 'http://localhost:3000/',
  PAYWAY_ENDPOINT = 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase',
  PORT = 3000
} = process.env;

// Small helper: pad cents for USD / accept KHR as integer amounts
function normalizeAmount(amount, currency='USD') {
  const n = Number(amount || 0);
  if (currency === 'KHR') return Math.round(n).toString();
  return n.toFixed(2);
}

// Optional shipping validation: amount must be subtotal+shipping if both provided
function validateAmount({ subtotal, shipping, amount }) {
  if (subtotal == null || shipping == null) return true;
  const sum = Number(subtotal) + Number(shipping);
  return Math.abs(sum - Number(amount)) < 0.01;
}

// --- PayWay: create purchase (HTML or QR) ---
app.post('/payway/create', async (req, res) => {
  try {
    const body = req.body || {};
    const currency = (body.currency || 'USD').toUpperCase();
    const amount = normalizeAmount(body.amount, currency);

    // optional check
    if (!validateAmount({ subtotal: body.subtotal, shipping: body.shipping, amount })) {
      return res.status(400).json({ error: 'Amount mismatch with subtotal+shipping' });
    }

    // Build fields PayWay expects
    const tran_id = body.tran_id || `trx-${Date.now()}`;
    const form = new FormData();
    form.append('merchant_id', PAYWAY_MERCHANT_ID);
    form.append('tran_id', tran_id);
    form.append('amount', amount);
    form.append('currency', currency);
    form.append('return_url', PAYWAY_RETURN_URL);
    form.append('cancel_url', PAYWAY_CANCEL_URL);
    // Optional extras
    if (body.firstname) form.append('firstname', body.firstname);
    if (body.lastname) form.append('lastname', body.lastname);
    if (body.email) form.append('email', body.email);
    if (body.phone) form.append('phone', body.phone);
    if (body.continue_success_url) form.append('continue_success_url', body.continue_success_url);
    if (body.return_params) form.append('return_params', body.return_params);
    if (Array.isArray(body.items)) {
      // send description
      const desc = body.items.map(i => `${i.name || i.title} x ${i.qty || 1}`).join(', ').slice(0, 255);
      form.append('items', desc);
    }

    // Signature: hash api_key + merchant_id + tran_id + amount + currency
    const signRaw = `${PAYWAY_API_KEY}${PAYWAY_MERCHANT_ID}${tran_id}${amount}${currency}`;
    const sign = crypto.createHash('sha512').update(signRaw).digest('hex');
    form.append('hash', sign);

    // Call PayWay
    const pw = await axios.post(PAYWAY_ENDPOINT, form, { headers: form.getHeaders(), timeout: 15000 });

    // Pass-through HTML or JSON
    const ctype = (pw.headers['content-type'] || '').toLowerCase();
    if (ctype.includes('text/html')) {
      res.set('content-type', 'text/html; charset=utf-8');
      return res.send(pw.data);
    }
    return res.json(pw.data);
  } catch (err) {
    console.error('[payway] purchase error detail:', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'PayWay purchase failed', detail: err?.response?.data || null });
  }
});

// Simple callback stub (manual trigger worked earlier)
app.post('/payway/callback', (req, res) => {
  // In sandbox, we just echo. In prod, verify signature and update order status.
  return res.json({ ok: true, check: true });
});

// Attach Telegram route
attachTelegramOrderRoutes(app);

app.listen(PORT, () => console.log('Server running on :' + PORT));
