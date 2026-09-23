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
  spoilagePoints: number;
  forcedSpikeNextTick: boolean;
  history: Reading[];
  risk: Risk;
  fraud: Fraud;
};

export type AlertEvent = {
  id: string;
  time: number;
  text: string;
  severity: "ok" | "warning" | "critical";
  batchId?: number;
  resolved?: boolean;
  resolvedAt?: number;
  diagnosis?: LLMAnalysisResult;
};

export type AnomalyAnalysis = {
  summary: string;
  likelyCause: string;
  actions: string[];
  confidence: number;
};

export type LLMAnalysisResult = {
  summary: string;
  likelyCause: string;
  actions: string[];
  prevention: string[];
  confidence: number;
  provider: "gemini" | "huggingface" | "demo";
  model: string;
  latencyMs: number;
  haccpRiskLevel: "Low" | "Moderate" | "Critical";
  isDemoFallback?: boolean;
};
