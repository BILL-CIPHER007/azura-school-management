import assert from "node:assert/strict";
import {
  asaasOfficialUrls,
  deleteAsaasPayment,
  getAsaasPayment,
  isAsaasSandboxConfigured,
  refundAsaasPayment
} from "../src/lib/asaas-client";
import { asaasPaymentStatusLabel, billingTypeLabel, chargeStatusLabel, paymentProviderLabel } from "../src/lib/financial-core";

assert.equal(asaasOfficialUrls.sandbox, "https://api-sandbox.asaas.com/v3");
assert.equal(asaasOfficialUrls.production, "https://api.asaas.com/v3");
assert.equal(billingTypeLabel("PIX"), "Pix");
assert.equal(billingTypeLabel("BOLETO"), "Boleto");
assert.equal(paymentProviderLabel("ASAAS"), "Asaas Sandbox");
assert.equal(chargeStatusLabel("REFUNDED"), "Reembolsado");
assert.equal(asaasPaymentStatusLabel("PAYMENT_DELETED"), "Removido no Asaas");
assert.equal(typeof isAsaasSandboxConfigured(), "boolean");
assert.equal(typeof getAsaasPayment, "function");
assert.equal(typeof deleteAsaasPayment, "function");
assert.equal(typeof refundAsaasPayment, "function");

console.log("Asaas integration validated successfully.");
