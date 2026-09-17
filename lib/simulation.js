// Core simulation + heuristic "AI" engine. Deliberately framework-free
// (no React/Next imports) so it can be sanity-checked with plain Node —
// see scripts/selfcheck.mjs.

export const STAGES = ["Farm", "Storage", "Truck", "Warehouse", "Shop", "Customer"];

// How much sensor variance each stage introduces (uncontrolled stages like
// Truck drift further from ideal than a monitored Warehouse).
const STAGE_VARIANCE = {
  Farm: 0.5,
  Storage: 0.3,
  Truck: 1.2,
  Warehouse: 0.4,
  Shop: 0.6,
  Customer: 0.6,
};

// Typical dwell time (hours) in each stage before moving to the next.
const STAGE_DWELL_HOURS = {
  Farm: 6,
  Storage: 10,
  Truck: 8,
  Warehouse: 12,
  Shop: 24,
  Customer: 9999, // terminal — batch retires from here
};

// Baseline shelf lives are set well above the ~60h total pipeline transit
// time (Farm..Shop) so a batch handled within normal tolerances comfortably
// survives the trip — spoilage should read as "this batch was mishandled,"
// not "the pipeline itself is too slow."
export const PRODUCTS = {
  milk: { label: "Milk", emoji: "🥛", idealTemp: 4, idealHumidity: 60, idealGas: 5, baselineShelfLifeHours: 120 },
  meat: { label: "Meat", emoji: "🥩", idealTemp: 2, idealHumidity: 75, idealGas: 8, baselineShelfLifeHours: 90 },
  fruit: { label: "Fruit", emoji: "🍌", idealTemp: 13, idealHumidity: 85, idealGas: 20, baselineShelfLifeHours: 168 },
  vegetable: { label: "Vegetable", emoji: "🍅", idealTemp: 10, idealHumidity: 80, idealGas: 15, baselineShelfLifeHours: 130 },
};

const PRODUCT_KEYS = Object.keys(PRODUCTS);

// Mock nearby markets for the "route optimization" recommendation.
export const SHOPS = [
  { id: "s1", name: "Green Market Downtown" },
  { id: "s2", name: "Riverside Grocers" },
  { id: "s3", name: "Uptown Fresh" },
  { id: "s4", name: "Harbor Foods" },
];

let nextId = 1;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

/** Create a fresh batch entering at Farm. */
export function createBatch(now) {
  const product = PRODUCT_KEYS[Math.floor(Math.random() * PRODUCT_KEYS.length)];
  const cfg = PRODUCTS[product];
  const batch = {
    id: nextId++,
    product,
    stage: "Farm",
    stageEnteredAt: now,
    createdAt: now,
    temp: cfg.idealTemp + rand(-0.5, 0.5),
    humidity: cfg.idealHumidity + rand(-2, 2),
    gas: cfg.idealGas + rand(-1, 1),
    spoilagePoints: 0,
    history: [],
    forcedSpikeNextTick: false,
    // Jittered per-batch so a fleet created together doesn't march through
    // every stage in perfect lockstep.
    dwellTarget: STAGE_DWELL_HOURS.Farm * rand(0.6, 1.4),
  };
  batch.history.push({ t: now, temp: batch.temp, humidity: batch.humidity, gas: batch.gas });
  batch.risk = computeRisk(batch);
  batch.fraud = detectFraud(batch);
  return batch;
}

/** Force a big anomaly into a batch's next reading (demo "inject anomaly" button). */
export function forceAnomaly(batch) {
  batch.forcedSpikeNextTick = true;
}

/**
 * Advance one batch by `dtHours` of simulated time: random-walks sensors,
 * accumulates spoilage, and may move it to the next stage.
 */
export function tickBatch(batch, now, dtHours) {
  const cfg = PRODUCTS[batch.product];
  const variance = STAGE_VARIANCE[batch.stage];

  if (batch.forcedSpikeNextTick) {
    batch.temp += rand(6, 10);
    batch.gas += rand(15, 25);
    batch.forcedSpikeNextTick = false;
  } else {
    // Random walk that drifts back toward ideal, scaled by stage variance.
    // Gas gets a small extra upward nudge (ripening/spoilage naturally
    // progresses) but still reverts toward ideal like the others, so it
    // doesn't runaway and false-flag every batch as fraudulent.
    batch.temp += rand(-variance, variance) + (cfg.idealTemp - batch.temp) * 0.05;
    batch.humidity += rand(-variance * 2, variance * 2) + (cfg.idealHumidity - batch.humidity) * 0.05;
    batch.gas += rand(-variance * 0.5, variance) + (cfg.idealGas - batch.gas) * 0.05;
  }

  batch.history.push({ t: now, temp: batch.temp, humidity: batch.humidity, gas: batch.gas });
  if (batch.history.length > 30) batch.history.shift();

  // Deviation-driven spoilage accrual: readings further from ideal age the
  // batch faster than real time. Small thresholds are forgiven as normal
  // sensor noise — only sustained/meaningful deviation should matter.
  const tempDeviation = Math.max(0, Math.abs(batch.temp - cfg.idealTemp) - 2);
  const humidityDeviation = Math.max(0, Math.abs(batch.humidity - cfg.idealHumidity) - 8);
  const gasDeviation = Math.max(0, batch.gas - cfg.idealGas * 1.8);
  const ageRate = 1 + tempDeviation * 0.15 + humidityDeviation * 0.02 + gasDeviation * 0.03;
  batch.spoilagePoints += ageRate * dtHours;

  // Stage progression.
  if (batch.stage !== "Customer" && now - batch.stageEnteredAt >= batch.dwellTarget) {
    const nextStage = STAGES[STAGES.indexOf(batch.stage) + 1];
    batch.stage = nextStage;
    batch.stageEnteredAt = now;
    batch.dwellTarget = STAGE_DWELL_HOURS[nextStage] * rand(0.6, 1.4);
  }

  return batch;
}

/**
 * Heuristic "AI" risk score — not a trained model, a transparent weighted
 * formula. Good enough to demo the concept and easy to explain live.
 */
export function computeRisk(batch) {
  const cfg = PRODUCTS[batch.product];
  const remainingShelfLifeHours = Math.max(0, cfg.baselineShelfLifeHours - batch.spoilagePoints);
  const riskScore = Math.min(100, Math.round((batch.spoilagePoints / cfg.baselineShelfLifeHours) * 100));
  const status = riskScore >= 80 ? "critical" : riskScore >= 50 ? "warning" : "ok";
  return { riskScore, remainingShelfLifeHours, status };
}

/**
 * Rule-based fraud/contamination detection: flags physically implausible
 * or inconsistent sensor behavior rather than just "value is high."
 */
export function detectFraud(batch) {
  const cfg = PRODUCTS[batch.product];
  const h = batch.history;
  if (h.length >= 2) {
    const prev = h[h.length - 2];
    const jump = Math.abs(batch.temp - prev.temp);
    const controlledStage = batch.stage === "Truck" || batch.stage === "Warehouse" || batch.stage === "Storage";
    if (jump > 5 && controlledStage) {
      return { fraudSuspected: true, reason: `Abrupt ${jump.toFixed(1)}°C jump during ${batch.stage} — possible cold-chain breach or sensor tampering.` };
    }
  }
  if (batch.gas > cfg.idealGas * 2.5 && batch.temp <= cfg.idealTemp + 1) {
    return { fraudSuspected: true, reason: "Gas reading far above normal despite controlled temperature — possible contamination or mislabeled batch." };
  }
  return { fraudSuspected: false, reason: null };
}

function makeEvent(now, text, severity, batchId) {
  return { id: `${now.toFixed(2)}-${Math.random().toString(36).slice(2, 7)}`, time: now, text, severity, batchId };
}

/**
 * Advance the whole fleet by one tick: updates sensors/risk/fraud on every
 * batch, retires batches that spoiled or reached the customer, spawns
 * replacements, and returns any alert-worthy events. `tracking` holds
 * cross-tick state (a Map of last-known status per batch id, and a Set of
 * batch ids already flagged for fraud) so escalations/fraud only fire once.
 */
export function stepFleet(batches, now, dtHours, tracking) {
  const events = [];
  let delivered = 0;
  let spoiled = 0;
  const result = batches.map((batch) => {
    tickBatch(batch, now, dtHours);
    batch.risk = computeRisk(batch);
    batch.fraud = detectFraud(batch);

    const prevStatus = tracking.statusById.get(batch.id);
    if (prevStatus && prevStatus !== batch.risk.status && batch.risk.status !== "ok") {
      events.push(makeEvent(now, `Batch #${batch.id} (${PRODUCTS[batch.product].label}) risk escalated to ${batch.risk.status.toUpperCase()} — ${batch.risk.riskScore}%`, batch.risk.status, batch.id));
    }
    tracking.statusById.set(batch.id, batch.risk.status);

    if (batch.fraud.fraudSuspected && !tracking.fraudFlagged.has(batch.id)) {
      tracking.fraudFlagged.add(batch.id);
      events.push(makeEvent(now, `Batch #${batch.id}: ${batch.fraud.reason}`, "critical", batch.id));
    }

    const isSpoiled = batch.risk.riskScore >= 100;
    const isDelivered = batch.stage === "Customer" && now - batch.stageEnteredAt > 3;
    if (isSpoiled || isDelivered) {
      if (isSpoiled) {
        spoiled++;
        events.push(makeEvent(now, `Batch #${batch.id} spoiled and was discarded.`, "critical", batch.id));
      } else {
        delivered++;
      }
      tracking.statusById.delete(batch.id);
      tracking.fraudFlagged.delete(batch.id);
      return createBatch(now);
    }
    return batch;
  });
  return { batches: result, events, delivered, spoiled };
}

/** Pick the best mock destination for a batch nearing risk (route optimization). */
export function recommendDestination(batch, shops, now) {
  // Deterministic-per-tick mock demand/stock so the recommendation is
  // stable within a render but still varies batch to batch and over time.
  const scored = shops.map((shop) => {
    const seed = (shop.id.charCodeAt(1) + batch.id + Math.floor(now)) % 10;
    const demand = 1 + (seed % 5); // 1-5
    const stock = 1 + ((seed * 3) % 5); // 1-5
    return { ...shop, demand, stock, score: demand / stock };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

/**
 * "AI Analyser" write-up for an anomaly — templated/hardcoded per anomaly
 * type rather than a real model call, but filled in with the batch's own
 * live readings so it reads like a live diagnosis rather than boilerplate.
 */
export function analyzeAnomaly(batch) {
  const cfg = PRODUCTS[batch.product];
  const latest = batch.history[batch.history.length - 1];

  if (batch.fraud.fraudSuspected && batch.fraud.reason.includes("jump")) {
    return {
      summary: `Cold-chain breach on Batch #${batch.id} (${cfg.label}) in ${batch.stage}: temperature jumped to ${latest.temp.toFixed(1)}°C, far outside the ${cfg.idealTemp}°C target. That's too sharp to be normal transit drift.`,
      likelyCause: "Most consistent with a refrigeration failure, a door or seal left open during handling, or a sensor being bypassed to mask spoilage.",
      actions: [
        `Quarantine batch #${batch.id} for manual inspection before it moves further.`,
        `Pull refrigeration/door-open logs for the ${batch.stage} leg to confirm the cause.`,
        "Cross-check GPS and handling logs for unscheduled stops.",
        "If inspection clears it, expedite to the highest-demand store immediately; otherwise discard and log as a loss.",
      ],
      confidence: 87,
    };
  }

  if (batch.fraud.fraudSuspected) {
    return {
      summary: `Batch #${batch.id} (${cfg.label}) shows a gas reading of ${latest.gas.toFixed(1)}ppm that's inconsistent with its ${latest.temp.toFixed(1)}°C — controlled temperature should keep gas near ${cfg.idealGas}ppm.`,
      likelyCause: "This mismatch is typical of microbial contamination, an undisclosed prior temperature excursion, or a mislabeled/mixed batch.",
      actions: [
        `Hold batch #${batch.id} out of the active pipeline pending a physical spot-check.`,
        "Verify batch labeling against the originating farm/supplier record.",
        "Re-test with a secondary gas sensor before releasing it.",
        "Do not route to a high-turnover store until contamination is ruled out.",
      ],
      confidence: 79,
    };
  }

  return {
    summary: `Batch #${batch.id} (${cfg.label}) is at ${batch.risk.riskScore}% spoilage risk with roughly ${Math.max(0, Math.round(batch.risk.remainingShelfLifeHours))}h of shelf life left, driven by sustained deviation from its ${cfg.idealTemp}°C / ${cfg.idealHumidity}% ideal range.`,
    likelyCause: "Consistent with cumulative handling stress (warmer truck/warehouse conditions) rather than a single sharp event.",
    actions: [
      "Reroute to the nearest high-demand store rather than a farther, lower-demand one.",
      "Move it ahead of lower-risk batches in the next handoff queue.",
      "Flag for a discount/quick-sale tag once it reaches the shop floor.",
    ],
    confidence: 68,
  };
}
