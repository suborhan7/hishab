/**
 * Reads a bKash screenshot (app receipt, push notification or SMS) with the
 * Gemini Flash vision model (free tier) and returns structured fields.
 * Nothing is saved here — the user always confirms on a pre-filled form.
 */
import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { TX_TYPES, type TxType } from "@/db/schema";

export type Extracted = {
  amount: number | null; // taka
  fee: number | null; // taka
  balanceAfter: number | null; // taka
  trxId: string | null;
  phone: string | null;
  counterpartyName: string | null;
  occurredAt: string | null; // "YYYY-MM-DDTHH:mm" in Bangladesh time
  type: TxType | null;
  direction: "in" | "out" | null;
  reference: string | null;
  confidence: "high" | "medium" | "low";
};

const PROMPT = `You read screenshots from the bKash mobile money app in Bangladesh.
The image is one of: an in-app transaction receipt/confirmation, a phone push notification, or an SMS from bKash.
Text may be in English or Bangla (Bangla digits ০-৯ must be converted to normal digits).

Extract exactly one transaction (the main / most recent one if several are visible):
- amount: principal amount in taka as a number (no currency sign, no commas). Do NOT include the fee.
- fee: the charge / fee / "খরচ" in taka. 0 if the screenshot says free/no charge, null if not shown.
- balanceAfter: the account balance after the transaction ("Balance", "ব্যালেন্স"), or null.
- trxId: the transaction ID ("TrxID", "Transaction ID", "ট্রানজেকশন আইডি"), uppercase letters+digits, usually 10 characters. null if missing.
- phone: the other party's phone / account / agent number as digits (e.g. 01712345678). null if missing.
- counterpartyName: the other party's name if shown, else null.
- occurredAt: date and time as "YYYY-MM-DDTHH:mm" (24h, Bangladesh time). bKash SMS often looks like "at 25/11/2026 14:30". null if missing.
- type: one of send_money (you sent money to someone), received (you received money from someone), cash_in (cash in from an agent), cash_out (cash out at an agent), payment (merchant payment / pay bill), mobile_recharge, other.
- direction: "in" if money came INTO this account (received, cash_in, refunds), "out" if it LEFT (send_money, cash_out, payment, mobile_recharge).
- reference: the reference / note text if any, else null.
- confidence: "high" if all key fields were clearly readable, "medium" if some were guessed, "low" if this is not a bKash transaction or mostly unreadable.`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    amount: { type: Type.NUMBER, nullable: true },
    fee: { type: Type.NUMBER, nullable: true },
    balanceAfter: { type: Type.NUMBER, nullable: true },
    trxId: { type: Type.STRING, nullable: true },
    phone: { type: Type.STRING, nullable: true },
    counterpartyName: { type: Type.STRING, nullable: true },
    occurredAt: { type: Type.STRING, nullable: true },
    type: { type: Type.STRING, enum: [...TX_TYPES], nullable: true },
    direction: { type: Type.STRING, enum: ["in", "out"], nullable: true },
    reference: { type: Type.STRING, nullable: true },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
  },
  required: ["amount", "trxId", "type", "direction", "confidence"],
};

export class GeminiNotConfigured extends Error {}

export async function extractFromScreenshot(image: Buffer, mimeType: string): Promise<Extracted> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiNotConfigured("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-flash-latest",
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: PROMPT }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0,
    },
  });

  const raw = JSON.parse(res.text ?? "{}") as Partial<Extracted>;
  return sanitize(raw);
}

/** Defensive clean-up of model output so the form never gets garbage. */
function sanitize(r: Partial<Extracted>): Extracted {
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const type = TX_TYPES.includes(r.type as TxType) ? (r.type as TxType) : null;
  const inferredDir = type ? (type === "received" || type === "cash_in" ? "in" : type === "other" ? null : "out") : null;
  const occurred = s(r.occurredAt);
  return {
    amount: n(r.amount),
    fee: n(r.fee),
    balanceAfter: n(r.balanceAfter),
    trxId: s(r.trxId)?.toUpperCase().replace(/\s+/g, "") ?? null,
    phone: s(r.phone)?.replace(/[^0-9+]/g, "") || null,
    counterpartyName: s(r.counterpartyName),
    occurredAt: occurred && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(occurred) ? occurred.slice(0, 16) : null,
    type,
    direction: r.direction === "in" || r.direction === "out" ? r.direction : inferredDir,
    reference: s(r.reference),
    confidence: r.confidence === "high" || r.confidence === "medium" ? r.confidence : "low",
  };
}
