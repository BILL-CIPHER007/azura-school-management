import assert from "node:assert/strict";
import { hasCommercialFeature } from "../src/lib/commercial-plans";
import {
  chargeStatusLabel,
  dateFromCivilInput,
  formatCurrencyBRL,
  getChargeDisplayStatus,
  parseCurrencyInput,
  toCivilDateKey
} from "../src/lib/financial-core";

assert.equal(hasCommercialFeature("ESSENCIAL", "finance"), false);
assert.equal(hasCommercialFeature("ESSENCIAL", "billing"), false);
assert.equal(hasCommercialFeature("PROFISSIONAL", "finance"), true);
assert.equal(hasCommercialFeature("PROFISSIONAL", "billing"), true);

assert.equal(parseCurrencyInput("R$ 1.250,50"), "1250.50");
assert.equal(parseCurrencyInput("450,00"), "450.00");
assert.equal(parseCurrencyInput("1250.5"), "1250.50");
assert.equal(parseCurrencyInput("0"), null);
assert.equal(parseCurrencyInput("abc"), null);

const validDate = dateFromCivilInput("2026-09-02");
assert.ok(validDate);
assert.equal(toCivilDateKey(validDate), "2026-09-02");
assert.equal(dateFromCivilInput("2026-02-31"), null);
assert.equal(dateFromCivilInput("02/09/2026"), null);

const now = new Date("2026-09-02T12:00:00.000Z");
assert.equal(getChargeDisplayStatus("PENDING", new Date("2026-09-01T12:00:00.000Z"), now), "OVERDUE");
assert.equal(getChargeDisplayStatus("PENDING", new Date("2026-09-02T12:00:00.000Z"), now), "PENDING");
assert.equal(getChargeDisplayStatus("PAID", new Date("2026-09-01T12:00:00.000Z"), now), "PAID");
assert.equal(getChargeDisplayStatus("CANCELED", new Date("2026-09-01T12:00:00.000Z"), now), "CANCELED");

assert.equal(chargeStatusLabel("OVERDUE"), "Vencido");
assert.equal(formatCurrencyBRL("1250.50").replace(/\s/u, " "), "R$ 1.250,50");

console.log("Financial core validated successfully.");
