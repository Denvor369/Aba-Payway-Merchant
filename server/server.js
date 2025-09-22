import "dotenv/config";
import express from "express";
import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PAYWAY_BASE = "https://checkout-sandbox.payway.com.kh";
const PURCHASE_URL = `${PAYWAY_BASE}/api/payment-gateway/v1/payments/purchase`;
const CHECK_URL    = `${PAYWAY_BASE}/api/payment-gateway/v1/payments/check-transaction-2`;

const MERCHANT_ID  = process.env.PAYWAY_MERCHANT_ID;
const API_KEY      = process.env.PAYWAY_API_KEY;
const RETURN_URL   = process.env.PAYWAY_RETURN_URL || "http://localhost:3000/payway/callback";
const CANCEL_URL   = process.env.PAYWAY_CANCEL_URL || "http://localhost:3000/";

app.get("/", (req, res) => res.send("ok"));

app.get("/diag/env", (req, res) => {
  const mask = (s)=> (s ? s.slice(0,4) + "***" + s.slice(-4) : "");
  res.json({
    merchant_id: MERCHANT_ID,
    api_key_masked: mask(API_KEY),
    return_url: RETURN_URL,
    cancel_url: CANCEL_URL
  });
});

function nowReqTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return d.getUTCFullYear().toString() + pad(d.getUTCMonth()+1) + pad(d.getUTCDate())
       + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
}

// exact concat order (include empty strings)
function computeHash(fields) {
  const {
    req_time, merchant_id, tran_id, amount, items, shipping, firstname, lastname,
    email, phone, type, payment_option, return_url, cancel_url, continue_success_url,
    return_deeplink, currency, custom_fields, return_params
  } = fields;

  const concat =
    (req_time ?? "") +
    (merchant_id ?? "") +
    (tran_id ?? "") +
    (amount ?? "") +
    (items ?? "") +
    (shipping ?? "") +
    (firstname ?? "") +
    (lastname ?? "") +
    (email ?? "") +
    (phone ?? "") +
    (type ?? "") +
    (payment_option ?? "") +
    (return_url ?? "") +
    (cancel_url ?? "") +
    (continue_success_url ?? "") +
    (return_deeplink ?? "") +
    (currency ?? "") +
    (custom_fields ?? "") +
    (return_params ?? "");
  const hmac = crypto.createHmac("sha512", API_KEY).update(concat).digest();
  return Buffer.from(hmac).toString("base64");
}

app.post("/payway/create", async (req, res) => {
  const {
    amount,                 // optional; if absent we compute it
    shipping = 0,           // optional numeric; default 0
    currency = "USD",
    items = [{ name: "Order", qty: 1, price: 0.10 }],
    firstname = "Guest",
    lastname = "Customer",
    email = "guest@example.com",
    phone = "+85500000000",
    continue_success_url = "",
    return_params = ""
  } = req.body || {};

  try {
    // normalize items
    const normItems = items.map(i => ({
      name: String(i.name || i.title || "Item"),
      quantity: Number(i.qty || i.quantity || 1),
      price: Number(i.price || 0)
    }));

    // compute subtotal
    const subtotal = normItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const shippingNum = Number(shipping || 0);
    let total = Number(amount ?? (subtotal + shippingNum));

    // PayWay expects amount === subtotal + shipping (USD with 2 decimals)
    // Force rounding to 2 decimals to avoid float drift
    const to2 = (n)=> Number(n).toFixed(2);
    const amountStr = to2(total);
    const shippingStr = to2(shippingNum);

    // If caller sent an amount that doesn't match subtotal+shipping, fix it
    const calcStr = to2(subtotal + shippingNum);
    if (amountStr !== calcStr) {
      console.warn("[payway] amount corrected to match subtotal+shipping", { amountStr, calcStr });
    }

    const itemsStr = JSON.stringify(normItems.map(i => ({
      name: i.name,
      quantity: i.quantity,
      price: to2(i.price)
    })));

    const tran_id = "trx-" + Date.now();
    console.log("[payway] create", { tran_id, subtotal: to2(subtotal), shipping: shippingStr, amount: calcStr, currency });
    const req_time = nowReqTime();

    const body = {
      req_time,
      merchant_id: MERCHANT_ID,
      tran_id,
      firstname,
      lastname,
      email,
      phone,
      type: "",
      payment_option: "",
      items: itemsStr,
      shipping: shippingStr,         // <-- IMPORTANT: always send "0.00" if none
      amount: calcStr,               // <-- amount equals subtotal + shipping
      currency,
      return_url: RETURN_URL,
      cancel_url: CANCEL_URL,
      skip_success_page: "",
      continue_success_url,
      return_deeplink: "",
      custom_fields: "",
      return_params
    };

    const hash = computeHash(body);
    const form = new FormData();
    Object.entries({ ...body, hash }).forEach(([k, v]) => form.append(k, v));

    const resp = await axios.post(PURCHASE_URL, form, { headers: form.getHeaders() });
    if (typeof resp.data !== "string" || resp.data.length < 100) {
      console.error("[payway] unexpected response", resp.status, resp.data);
    }
    res.status(200).send(resp.data);
  } catch (e) {
    const detail = e.response?.data || e.message || String(e);
    console.error("[payway] purchase error detail:", detail);
    res.status(500).json({ error: "PayWay purchase failed", detail });
  }
});

app.post("/payway/callback", async (req, res) => {
  try {
    const { tran_id } = req.body || {};
    if (!tran_id) return res.status(400).json({ ok: false, error: "missing tran_id" });

    const req_time = nowReqTime();
    const payload = {
      req_time,
      merchant_id: MERCHANT_ID,
      tran_id,
      hash: computeHash({ req_time, merchant_id: MERCHANT_ID, tran_id })
    };

    const check = await axios.post(CHECK_URL, payload, { headers: { "Content-Type": "application/json" } });
    const data = check.data?.data || {};
    res.json({ ok: true, status: data.payment_status, code: data.payment_status_code, check: data });
  } catch (e) {
    const detail = e.response?.data || e.message || String(e);
    console.error("[payway] callback error detail:", detail);
    res.status(500).json({ ok: false, detail });
  }
});

app.listen(3000, () => console.log("PayWay sandbox server running on :3000"));
