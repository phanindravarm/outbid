import Razorpay from "razorpay";
import crypto from "crypto";

function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables.",
    );
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export interface CreateOrderParams {
  amountPaise: number; // amount in smallest currency unit (paise)
  currency?: string;
  receipt: string; // unique identifier (bid ID)
  notes?: Record<string, string>;
}

export async function createRazorpayOrder({
  amountPaise,
  currency = "INR",
  receipt,
  notes,
}: CreateOrderParams) {
  const razorpay = getRazorpayInstance();

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt,
    notes: notes ?? {},
  });

  return order;
}

export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export function verifyWebhookSignature({
  body,
  signature,
}: {
  body: string;
  signature: string;
}): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}
