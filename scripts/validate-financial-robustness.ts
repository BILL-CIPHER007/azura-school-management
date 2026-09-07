import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canCancelAsaasPaymentStatus,
  canRequestRefund,
  nextChargeStatusFromAsaas,
  normalizeAsaasPaymentStatus
} from "../src/lib/financial-core";

assert.equal(normalizeAsaasPaymentStatus("PAYMENT_RECEIVED"), "RECEIVED");
assert.equal(normalizeAsaasPaymentStatus("PAYMENT_CONFIRMED"), "CONFIRMED");
assert.equal(normalizeAsaasPaymentStatus("PAYMENT_DELETED"), "DELETED");
assert.equal(normalizeAsaasPaymentStatus("PAYMENT_REFUND_IN_PROGRESS"), "REFUND_IN_PROGRESS");
assert.equal(normalizeAsaasPaymentStatus("PAYMENT_PARTIALLY_REFUNDED"), "PARTIALLY_REFUNDED");
assert.equal(normalizeAsaasPaymentStatus("PAYMENT_REFUND_DENIED"), "REFUND_DENIED");
assert.equal(normalizeAsaasPaymentStatus("unexpected"), "UNKNOWN");

assert.equal(canCancelAsaasPaymentStatus("PENDING"), true);
assert.equal(canCancelAsaasPaymentStatus("OVERDUE"), true);
assert.equal(canCancelAsaasPaymentStatus("RECEIVED"), false);
assert.equal(canCancelAsaasPaymentStatus("CONFIRMED"), false);
assert.equal(canCancelAsaasPaymentStatus("REFUNDED"), false);
assert.equal(canCancelAsaasPaymentStatus("DELETED"), false);

assert.equal(canRequestRefund("PAID", "PIX", "RECEIVED"), true);
assert.equal(canRequestRefund("PAID", "PIX", "CONFIRMED"), true);
assert.equal(canRequestRefund("PENDING", "PIX", "RECEIVED"), false);
assert.equal(canRequestRefund("PAID", "BOLETO", "RECEIVED"), false);
assert.equal(canRequestRefund("PAID", "PIX", "PENDING"), false);
assert.equal(canRequestRefund("REFUNDED", "PIX", "RECEIVED"), false);

assert.equal(nextChargeStatusFromAsaas("PENDING", "PAYMENT_RECEIVED"), "PAID");
assert.equal(nextChargeStatusFromAsaas("PENDING", "PAYMENT_CONFIRMED"), "PAID");
assert.equal(nextChargeStatusFromAsaas("PENDING", "PAYMENT_DELETED"), "CANCELED");
assert.equal(nextChargeStatusFromAsaas("PAID", "PAYMENT_REFUNDED"), "REFUNDED");
assert.equal(nextChargeStatusFromAsaas("PENDING", "PAYMENT_REFUNDED"), "REFUNDED");
assert.equal(nextChargeStatusFromAsaas("PAID", "PAYMENT_DELETED"), null);
assert.equal(nextChargeStatusFromAsaas("REFUNDED", "PAYMENT_RECEIVED"), null);
assert.equal(nextChargeStatusFromAsaas("CANCELED", "PAYMENT_RECEIVED"), null);

const financialService = readFileSync("src/services/financial.ts", "utf8");
assert.match(financialService, /where:\s*\{\s*id:\s*chargeId,\s*schoolId\s*\}/);
assert.match(financialService, /assertFinancialFeature\(schoolId/);
assert.match(financialService, /findUnique\(\{\s*where:\s*\{\s*externalPaymentId\s*\}/);
assert.match(financialService, /if \(isUniqueConstraintError\(error\)\) return \{ status: "duplicate"/);
const syncStart = financialService.indexOf("export async function syncChargeWithAsaas");
const refundStart = financialService.indexOf("export async function requestChargeRefund");
assert.ok(syncStart > -1);
assert.ok(refundStart > syncStart);
const syncFunction = financialService.slice(syncStart, refundStart);
assert.doesNotMatch(syncFunction, /createAsaasPayment/);

console.log("Financial robustness validated successfully.");
