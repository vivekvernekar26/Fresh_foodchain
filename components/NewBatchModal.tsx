"use client";

import { useState } from "react";
import type { Batch } from "@/lib/types";
import { PRODUCTS } from "@/lib/simulation.js";

const STAGE_OPTIONS = [
  { key: "Farm", label: "Farm Source", emoji: "🌾", desc: "Harvest & initial packing" },
  { key: "Storage", label: "Cold Storage", emoji: "🏭", desc: "Pre-transit cooling facility" },
  { key: "Truck", label: "Smart Transit", emoji: "🚛", desc: "Active highway reefer truck" },
  { key: "Warehouse", label: "Logistics Hub", emoji: "🏪", desc: "Regional distribution center" },
  { key: "Shop", label: "Retail Outlet", emoji: "🛒", desc: "Supermarket shelf display" },
] as const;

type ProductKey = "milk" | "meat" | "fruit" | "vegetable";

export default function NewBatchModal({
  onAdd,
  onClose,
}: {
  onAdd: (product: ProductKey, stage: Batch["stage"]) => void;
  onClose: () => void;
}) {
  const [selectedProduct, setSelectedProduct] = useState<ProductKey>("milk");
  const [selectedStage, setSelectedStage] = useState<Batch["stage"]>("Farm");

  const productList = Object.entries(PRODUCTS) as [
    ProductKey,
    { label: string; emoji: string; idealTemp: number; idealHumidity: number; idealGas: number; baselineShelfLifeHours: number }
  ][];

  const currentCfg = PRODUCTS[selectedProduct];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(selectedProduct, selectedStage);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4"
      style={{ background: "rgba(6, 9, 14, 0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden glass-panel animate-slide-up border border-emerald-500/40 shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_40px_rgba(16,185,129,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <span className="text-base leading-none">＋</span>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                Dispatch New Food Cargo
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure commodity, cold-chain profile &amp; entry checkpoint
              </p>
            </div>
          </div>
          <button
            id="new-batch-close"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Step 1: Select Product Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              1. Select Commodity / Product
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {productList.map(([key, cfg]) => {
                const isSelected = selectedProduct === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedProduct(key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        : "bg-slate-900/60 border-white/5 hover:bg-slate-800/60 hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">
                        {cfg.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-data">
                        Ideal: {cfg.idealTemp}°C · {cfg.idealHumidity}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Starting Stage */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              2. Entry Checkpoint in Supply Chain
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STAGE_OPTIONS.map((st) => {
                const isSelected = selectedStage === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setSelectedStage(st.key as Batch["stage"])}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150 ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        : "bg-slate-900/60 border-white/5 hover:bg-slate-800/60 hover:border-white/20"
                    }`}
                  >
                    <span className="text-lg">{st.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200">
                        {st.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {st.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dispatch Summary Pill */}
          <div className="rounded-xl p-3 bg-slate-950/60 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentCfg.emoji}</span>
              <div>
                <span className="font-bold text-slate-200">{currentCfg.label}</span>
                <span className="text-slate-400"> departing at </span>
                <span className="text-cyan-300 font-semibold">{selectedStage}</span>
              </div>
            </div>
            <div className="text-[11px] font-mono-data text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              {currentCfg.baselineShelfLifeHours}h Baseline
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-dispatch-btn"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🚀</span>
              <span>Confirm Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
