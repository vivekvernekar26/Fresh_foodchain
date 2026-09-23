import { NextResponse } from "next/server";
import type { Batch, LLMAnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

interface RequestBody {
  batch: Batch;
  provider?: "gemini" | "huggingface" | "auto";
  apiKey?: string;
  modelOverride?: string;
}

const SYSTEM_PROMPT = `You are FreshChain AI Engine, a specialized cold-chain logistics and food microbiology expert system.
Your task is to analyze real-time IoT sensor telemetry from a food transit batch that has triggered an anomaly or quality deviation.

Analyze the given food cargo payload according to HACCP principles, bacterial growth risk curves, ethylene maturation, and cold-chain integrity protocols.

Respond ONLY with a valid JSON object with the following fields:
{
  "summary": "Clear, concise 2-3 sentence technical diagnosis of the incident, citing exact numbers.",
  "likelyCause": "Root cause analysis detailing the physical/mechanical failure (e.g., refrigeration compressor stall, faulty door gasket, fraudulent sensor bypass, respiration spike).",
  "actions": [
    "Immediate directive 1",
    "Immediate directive 2",
    "Immediate directive 3",
    "Immediate directive 4"
  ],
  "prevention": [
    "Preventative recommendation 1",
    "Preventative recommendation 2",
    "Preventative recommendation 3"
  ],
  "confidence": 88,
  "haccpRiskLevel": "Critical" // "Low", "Moderate", or "Critical"
}
Ensure confidence is an integer between 50 and 99. Return ONLY the JSON object without markdown fences.`;

function buildBatchPrompt(batch: Batch): string {
  const latestHistory = batch.history.slice(-6);
  const historyText = latestHistory
    .map(
      (h) =>
        `T+${h.t.toFixed(1)}h: Temp=${h.temp.toFixed(1)}°C, Humidity=${h.humidity.toFixed(1)}%, Gas=${h.gas.toFixed(1)}ppm`
    )
    .join("\n");

  return `Food Batch Profile:
- Batch ID: #${batch.id}
- Commodity: ${batch.product.toUpperCase()}
- Current Stage: ${batch.stage}
- Current Telemetry: Temp=${batch.temp.toFixed(1)}°C, Humidity=${batch.humidity.toFixed(1)}%, Gas=${batch.gas.toFixed(1)}ppm
- Risk Score: ${batch.risk.riskScore}% (${batch.risk.status})
- Remaining Shelf Life Estimate: ${Math.max(0, batch.risk.remainingShelfLifeHours).toFixed(1)} hours
- Fraud / Tampering Flag: ${batch.fraud.fraudSuspected ? `YES (${batch.fraud.reason || "anomaly detected"})` : "None"}
- Recent Sensor Trajectory (Last ${latestHistory.length} readings):
${historyText}

Perform HACCP cold chain failure analysis and provide your diagnostic JSON output.`;
}

// ── Google Gemini API Call (Free tier: gemini-1.5-flash / gemini-2.0-flash) ──
async function callGemini(
  prompt: string,
  apiKey: string,
  modelName = "gemini-1.5-flash"
): Promise<{ result: Partial<LLMAnalysisResult>; raw: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API");

  const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleanJson);
  return { result: parsed, raw: text };
}

// ── Hugging Face Inference API Call ─────────────────────────────────────────
async function callHuggingFace(
  prompt: string,
  apiKey: string,
  modelName = "Qwen/Qwen2.5-72B-Instruct"
): Promise<{ result: Partial<LLMAnalysisResult>; raw: string }> {
  const url = `https://router.huggingface.co/hf-inference/models/${modelName}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    // Try fallback to standard HF inference API endpoint if router doesn't respond
    const altUrl = `https://api-inference.huggingface.co/models/${modelName}`;
    const altResponse = await fetch(altUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        inputs: `<|system|>${SYSTEM_PROMPT}<|user|>${prompt}<|assistant|>`,
        parameters: { max_new_tokens: 700, temperature: 0.2 },
      }),
    });

    if (!altResponse.ok) {
      const err = await response.text();
      throw new Error(`Hugging Face API failed: ${err}`);
    }

    const altData = await altResponse.json();
    const genText = Array.isArray(altData)
      ? altData[0]?.generated_text || ""
      : altData.generated_text || "";
    const jsonMatch = genText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse JSON from Hugging Face output");
    const parsed = JSON.parse(jsonMatch[0]);
    return { result: parsed, raw: genText };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not extract JSON from Hugging Face chat completion");
  const parsed = JSON.parse(jsonMatch[0]);
  return { result: parsed, raw: content };
}

// ── Smart Food-Safety Fallback Generator ────────────────────────────────────
function generateSmartFallback(batch: Batch, providerAttempted: string): LLMAnalysisResult {
  const isTempHigh = batch.temp > 10;
  const isGasHigh = batch.gas > 12;
  const isFraud = batch.fraud.fraudSuspected;

  let summary = `Live telemetry for Batch #${batch.id} (${batch.product.toUpperCase()}) indicates an active threshold breach during ${batch.stage}. Current temp of ${batch.temp.toFixed(1)}°C and gas level of ${batch.gas.toFixed(1)}ppm reflect immediate cold chain degradation.`;
  let likelyCause = "Primary indicator points to thermal envelope penetration, likely caused by transport refrigeration evaporator defrost failure, prolonged loading dock dwell, or door micro-breaches.";
  let haccpRiskLevel: "Low" | "Moderate" | "Critical" = "Moderate";
  let confidence = 86;

  if (isFraud) {
    summary = `CRITICAL INTEGRITY BREACH: Batch #${batch.id} (${batch.product}) exhibits uncharacteristic sensor correlation (${batch.fraud.reason || "abrupt telemetry delta"}). Temperature reached ${batch.temp.toFixed(1)}°C with anomalous variance.`;
    likelyCause = "Physical telemetry tampering suspected, or severe compressor shutdown during transit masked by delayed sensor transmit intervals.";
    haccpRiskLevel = "Critical";
    confidence = 94;
  } else if (isTempHigh && isGasHigh) {
    summary = `ACUTE CONTAMINATION ALERT: Batch #${batch.id} has experienced compounding thermal and biological excursion (Temp: ${batch.temp.toFixed(1)}°C, Gas: ${batch.gas.toFixed(1)}ppm) accelerating bacterial reproduction.`;
    likelyCause = "Catastrophic cooling outage coupled with active microbial decomposition, releasing volatile organic amines and ethylene gases.";
    haccpRiskLevel = "Critical";
    confidence = 91;
  } else if (isTempHigh) {
    summary = `Cold-chain thermal deviation detected on Batch #${batch.id}. Temperature has climbed to ${batch.temp.toFixed(1)}°C in the ${batch.stage} stage, exceeding critical HACCP control bounds.`;
    likelyCause = "Reefer power supply interruption, faulty thermostatic expansion valve, or air circulation blockage inside the cargo bay.";
    haccpRiskLevel = "Critical";
    confidence = 88;
  }

  return {
    summary,
    likelyCause,
    actions: [
      `Place Batch #${batch.id} in immediate physical quarantine upon arrival at ${batch.stage}.`,
      "Perform independent core temperature probe validation using a calibrated NIST thermometer.",
      "Extract trailer/facility digital refrigeration and door event datalogger archives.",
      "Notify regional food safety director and update transit ledger status to HELD.",
    ],
    prevention: [
      "Mandate secondary redundant Bluetooth Low Energy (BLE) temperature loggers placed directly in pallets.",
      "Configure automated geofenced push alerts when ambient cargo temperature deviates > 1.5°C from setpoint.",
      "Perform weekly ultrasonic seal inspection on reefer doors and latches.",
    ],
    confidence,
    haccpRiskLevel,
    provider: "demo",
    model: `${providerAttempted} (Demo Mode · Configure in .env.local)`,
    latencyMs: 380,
    isDemoFallback: true,
  };
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body: RequestBody = await req.json();
    const { batch, provider = "gemini", apiKey, modelOverride } = body;

    if (!batch) {
      return NextResponse.json({ error: "Missing batch data" }, { status: 400 });
    }

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    const hfKey = apiKey || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

    const prompt = buildBatchPrompt(batch);

    // 1. Try Gemini if requested
    if (provider === "gemini") {
      if (geminiKey) {
        try {
          const model = modelOverride || "gemini-1.5-flash";
          const { result } = await callGemini(prompt, geminiKey, model);
          const latencyMs = Date.now() - startTime;

          const response: LLMAnalysisResult = {
            summary: result.summary || "Diagnostic completed.",
            likelyCause: result.likelyCause || "Inconclusive telemetry pattern.",
            actions: Array.isArray(result.actions) ? result.actions : ["Inspect batch manually."],
            prevention: Array.isArray(result.prevention) ? result.prevention : ["Review sensor calibration."],
            confidence: Number(result.confidence) || 85,
            haccpRiskLevel: result.haccpRiskLevel || "Moderate",
            provider: "gemini",
            model: `Google ${model} (Live API)`,
            latencyMs,
            isDemoFallback: false,
          };

          return NextResponse.json(response);
        } catch (geminiErr: any) {
          console.warn("Gemini call failed, falling back to smart simulation:", geminiErr?.message || geminiErr);
        }
      }
    }

    // 2. Try Hugging Face if requested
    if (provider === "huggingface") {
      if (hfKey) {
        try {
          const model = modelOverride || "Qwen/Qwen2.5-72B-Instruct";
          const { result } = await callHuggingFace(prompt, hfKey, model);
          const latencyMs = Date.now() - startTime;

          const response: LLMAnalysisResult = {
            summary: result.summary || "Diagnostic completed.",
            likelyCause: result.likelyCause || "Inconclusive telemetry pattern.",
            actions: Array.isArray(result.actions) ? result.actions : ["Inspect batch manually."],
            prevention: Array.isArray(result.prevention) ? result.prevention : ["Review sensor calibration."],
            confidence: Number(result.confidence) || 85,
            haccpRiskLevel: result.haccpRiskLevel || "Moderate",
            provider: "huggingface",
            model: `Hugging Face ${model} (Live API)`,
            latencyMs,
            isDemoFallback: false,
          };

          return NextResponse.json(response);
        } catch (hfErr: any) {
          console.warn("Hugging Face call failed, falling back to smart simulation:", hfErr?.message || hfErr);
        }
      }
    }

    // 3. Fallback: If no API key provided or external service unavailable
    const fallback = generateSmartFallback(batch, provider === "gemini" ? "Gemini 1.5 Flash" : "Hugging Face");
    fallback.latencyMs = Date.now() - startTime + 250;
    return NextResponse.json(fallback);
  } catch (error: any) {
    console.error("Error in analyze-anomaly route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process anomaly analysis" },
      { status: 500 }
    );
  }
}
