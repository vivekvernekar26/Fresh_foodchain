# 🌾 FreshChain — AI-Powered Cold-Chain Integrity & Spoilage Prevention

> **Next-Generation Autonomous Food Logistics Telemetry & HACCP Incident Intelligence System**  
> Real-time IoT sensory monitoring, dynamic shelf-life forecasting, anomaly detection, tampering/fraud prevention, and LLM-powered root-cause diagnosis.

---

## 🌟 Overview

**FreshChain** is an enterprise-grade digital control tower designed for cold-chain logistics operations. It tracks perishable food consignments end-to-end across six critical lifecycle stages:

```
🌾 Farm  ──►  🏭 Storage  ──►  🚛 Truck  ──►  🏪 Warehouse  ──►  🛒 Shop  ──►  👤 Customer
```

At every milestone, IoT telemetry sensors report real-time **temperature (°C)**, **relative humidity (%)**, and **volatile organic gas / ethylene levels (ppm)**. FreshChain's engine converts raw telemetry into actionable intelligence, stopping spoilage before it happens.

---

## ✨ Key Features

### 1. 🤖 Live AI Anomaly Diagnosis (Google Gemini & Hugging Face)
- **Deep Root-Cause Analysis:** Leverages Google Gemini (`gemini-1.5-flash`) and open LLM architectures to assess HACCP violations, microbial reproduction curves, and mechanical cooling failures.
- **Actionable Directives:** Generates immediate quarantine protocols, sensor recalibration mandates, and preventative cold-chain maintenance actions.
- **Fail-Safe Offline Mode:** Seamlessly falls back to an internal microbiology heuristic expert system if no API key is provided or network calls fail.

### 2. 🗺️ Interactive Live Route Map & Pipeline Board
- **SVG Transit Map:** Real-time visual tracking of batches navigating supply chain hubs with pulse alerts on compromised routes.
- **Interactive Kanban Pipeline:** Stage-by-stage consignment overview with instant risk categorization, remaining shelf life counters, and tampering tags.

### 3. 🧪 Anomaly Injection & Stress Testing
- Simulate real-world supply chain crises on demand:
  - 🌡️ **Reefer Compressor Stall (Heat Spike):** Rapid thermal envelope failure.
  - ☣️ **Biological Gas Breach (Ethylene Spurt):** Accelerated respiration and microbial rot.
  - 🕵️ **Sensor Tampering / Fraud:** Artificially frozen or masked telemetry.
  - 🏜️ **Desiccation:** Extreme humidity drops causing moisture loss.

### 4. 📦 Dynamic Batch Management
- **Custom Consignment Creation:** Dispatch new batches (Milk, Meat, Fruit, Vegetables, Seafood) with custom payload sizes and origin stages.
- **Automated Rerouting:** Proactively suggest diverting high-risk batches to nearest high-throughput retail stores to prevent stock condemnation.

### 5. 📊 Real-Time KPI Telemetry & Incident Feed
- Live counters for **Cold Chain Integrity %**, **Prevented Food Waste**, **Fleet Average Risk**, and **Active HACCP Breaches**.
- Filterable chronological alert feed with single-click batch inspection.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.17+ (v20+ recommended)
- **npm** or **pnpm** / **yarn**

### 2. Installation & Setup

```bash
# 1. Navigate to the project directory
cd freshchain-demo

# 2. Install dependencies
npm install

# 3. (Optional) Configure Gemini API Key for live AI diagnosis
cp .env.local.example .env.local   # or edit .env.local directly
```

### 3. Environment Configuration (`.env.local`)

To enable live Google Gemini analysis, add your API key to `.env.local`:

```env
# Google AI Studio API Key (Free tier available: https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# (Optional) Hugging Face User Access Token
HUGGINGFACE_API_KEY=your_huggingface_token_here
```

> *Note: If no API key is set, the dashboard automatically operates in **Smart Simulator Mode** with realistic food microbiology diagnostics.*

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧬 Supported Commodity Catalog

| Commodity | Ideal Temp | Ideal Humidity | Max Tolerance | Base Shelf Life | Primary Spoilage Vulnerability |
|:---|:---:|:---:|:---:|:---:|:---|
| 🥛 **Milk & Dairy** | 4.0°C | 60% | 8.0°C | 120 hrs | *Lactobacillus* proliferation, souring |
| 🥩 **Fresh Meat** | 2.0°C | 75% | 5.0°C | 90 hrs | *Pseudomonas* slime, lipid oxidation |
| 🍌 **Tropical Fruit** | 13.0°C | 85% | 18.0°C | 168 hrs | Ethylene hyper-maturation, chilling injury |
| 🍅 **Vegetables** | 10.0°C | 80% | 14.0°C | 130 hrs | Moisture loss, fungal mold propagation |

---

## 🏗️ Architecture & Project Structure

```
freshchain-demo/
├── app/
│   ├── api/
│   │   └── analyze-anomaly/
│   │       └── route.ts         # Gemini / Hugging Face backend API & fallback engine
│   ├── globals.css              # Glassmorphic dark design system & animation tokens
│   ├── layout.tsx               # Root layout & typography setup
│   └── page.tsx                 # Main control tower dashboard orchestration
├── components/
│   ├── AIAnalysisModal.tsx      # Comprehensive AI HACCP diagnostic & resolution modal
│   ├── AlertsFeed.tsx           # Chronological live event & breach notifications
│   ├── AnomalyPanel.tsx         # Anomaly injector for scenario testing
│   ├── BatchDetail.tsx          # Telemetry sparklines, spoilage curves & actions
│   ├── BatchPicker.tsx          # Fast consignment switcher & filter
│   ├── Controls.tsx             # Simulation speed, pause/resume & quick triggers
│   ├── NewBatchModal.tsx        # Dynamic consignment dispatcher modal
│   ├── PipelineBoard.tsx        # 6-stage Kanban board with risk badges
│   ├── RouteMap.tsx             # SVG supply chain geographic telemetry tracking
│   ├── SensorGauge.tsx          # Radial SVG telemetry gauge with threshold markers
│   └── StatsBar.tsx             # Real-time animated executive KPI counters
├── lib/
│   ├── simulation.js            # Physics & microbiology supply chain simulation engine
│   └── types.ts                 # TypeScript type definitions & data schemas
├── public/                      # Static assets & icons
└── .env.local                   # Local environment credentials (gitignored)
```

---

## ⚙️ How the Simulation Engine Works

1. **Stochastic Thermal & Gas Modeling:** Readings evolve based on transport environment friction, refrigeration cooling cycles, and stage transition delays.
2. **Cumulative Degradation Function:** Spoilage is non-linear; brief severe thermal excursions permanently penalize remaining shelf life even if temperature normalizes.
3. **Fraud Detection Algorithm:** Cross-correlates ambient stage conditions against sensor reports to identify frozen telemetry loops or bypassed data-loggers.
4. **Lifecycle Turnover:** Batches reaching the **Customer** stage are logged as successfully delivered, while critically condemned batches trigger salvage or disposal workflows.

---

## 🛠️ Verification & Build

```bash
# Run Next.js production build check
npm run build

# Run linting
npm run lint
```

---

## 📄 License

This project is proprietary and maintained for the FreshChain initiative.
