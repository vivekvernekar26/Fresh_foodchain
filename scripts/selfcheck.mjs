// Sanity check for the heuristic risk/fraud logic in lib/simulation.js.
// Plain Node + node:assert — no test framework. Run: node scripts/selfcheck.mjs
import assert from "node:assert/strict";
import { createBatch, tickBatch, computeRisk, detectFraud, recommendDestination, stepFleet, SHOPS } from "../lib/simulation.js";

// A batch held at ideal conditions should show low risk and most of its
// shelf life remaining.
const fresh = createBatch(0);
fresh.temp = 4; fresh.humidity = 60; fresh.gas = 5; // milk ideal-ish regardless of random product, force values
for (let i = 0; i < 5; i++) tickBatch(fresh, i, 1);
const freshRisk = computeRisk(fresh);
assert.ok(freshRisk.riskScore < 50, `expected low risk for ideal conditions, got ${freshRisk.riskScore}`);
assert.equal(freshRisk.status, "ok");

// A batch left hot for a long time should be flagged critical with little
// shelf life left. Product is pinned (rather than createBatch's random
// pick) so this check isn't flaky — products with a long baseline shelf
// life (e.g. fruit) legitimately take longer to cross the critical line.
const spoiling = createBatch(0);
spoiling.product = "meat";
for (let i = 0; i < 40; i++) {
  spoiling.temp = 30; // simulate a broken freezer holding it hot every tick
  tickBatch(spoiling, i, 1);
}
const spoilingRisk = computeRisk(spoiling);
assert.ok(spoilingRisk.riskScore > 80, `expected high risk after prolonged heat, got ${spoilingRisk.riskScore}`);
assert.equal(spoilingRisk.status, "critical");
assert.equal(spoilingRisk.remainingShelfLifeHours < 10, true);

// An abrupt temperature jump during a controlled stage should trip fraud
// detection; stable readings should not.
const tampered = createBatch(0);
tampered.stage = "Truck";
tickBatch(tampered, 1, 1);
tampered.temp += 12; // simulate a sudden jump on the next reading
tampered.history.push({ t: 2, temp: tampered.temp, humidity: tampered.humidity, gas: tampered.gas });
const fraud = detectFraud(tampered);
assert.equal(fraud.fraudSuspected, true, "expected abrupt jump to be flagged as fraud");

const stable = createBatch(0);
for (let i = 0; i < 5; i++) tickBatch(stable, i, 1);
assert.equal(detectFraud(stable).fraudSuspected, false, "stable batch should not be flagged");

// Destination recommendation should return one of the known mock shops.
const rec = recommendDestination(fresh, SHOPS, 0);
assert.ok(SHOPS.some((s) => s.id === rec.id), "recommendation should be one of the mock shops");

// stepFleet should retire a spoiled batch, spawn a replacement, and emit an event.
const tracking = { statusById: new Map(), fraudFlagged: new Set() };
let fleet = [createBatch(0)];
fleet[0].product = "meat"; // pin for a deterministic, non-flaky check
let totalSpoiled = 0;
const allEvents = [];
for (let i = 1; i <= 60; i++) {
  fleet[0].temp = 30; // simulate a broken freezer holding it hot every tick
  const result = stepFleet(fleet, i, 1, tracking);
  fleet = result.batches;
  totalSpoiled += result.spoiled;
  allEvents.push(...result.events);
}
// Note: random walk means a replacement batch can occasionally also spoil
// within the window, so assert "at least one" rather than an exact count.
assert.ok(totalSpoiled >= 1, "expected the overheated batch to be marked spoiled");
assert.equal(fleet.length, 1, "fleet size should stay stable (spoiled batches are replaced 1-for-1)");
assert.ok(allEvents.some((e) => e.text.includes("spoiled")), "expected a spoilage event");

console.log("selfcheck: all assertions passed");
