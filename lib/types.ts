// Shape of the plain-JS objects produced by lib/simulation.js, typed here
// so the .tsx components get autocomplete/checking without converting the
// (deliberately framework-free) engine to TypeScript.
export type Reading = { t: number; temp: number; humidity: number; gas: number };

export type Risk = { riskScore: number; remainingShelfLifeHours: number; status: "ok" | "warning" | "critical" };

export type Fraud = { fraudSuspected: boolean; reason: string | null };

export type Batch = {
  id: number;
  product: "milk" | "meat" | "fruit" | "vegetable";
  stage: "Farm" | "Storage" | "Truck" | "Warehouse" | "Shop" | "Customer";
  stageEnteredAt: number;
  dwellTarget: number;
  createdAt: number;
  temp: number;
  humidity: number;
  gas: number;
  history: Reading[];
  risk: Risk;
  fraud: Fraud;
};

export type AlertEvent = { id: string; time: number; text: string; severity: "ok" | "warning" | "critical" };

export type AnomalyAnalysis = {
  summary: string;
  likelyCause: string;
  actions: string[];
  confidence: number;
};
