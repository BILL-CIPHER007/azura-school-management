import assert from "node:assert/strict";
import { asaasOfficialUrls, isAsaasSandboxConfigured } from "../src/lib/asaas-client";
import { billingTypeLabel, chargeStatusLabel, paymentProviderLabel } from "../src/lib/financial-core";

assert.equal(asaasOfficialUrls.sandbox, "https://api-sandbox.asaas.com/v3");
assert.equal(asaasOfficialUrls.production, "https://api.asaas.com/v3");
assert.equal(billingTypeLabel("PIX"), "Pix");
assert.equal(billingTypeLabel("BOLETO"), "Boleto");
assert.equal(paymentProviderLabel("ASAAS"), "Asaas Sandbox");
assert.equal(chargeStatusLabel("REFUNDED"), "Reembolsado");
assert.equal(typeof isAsaasSandboxConfigured(), "boolean");

console.log("Asaas integration validated successfully.");
