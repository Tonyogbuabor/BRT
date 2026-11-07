import React, { useState } from 'react';
import {
  Settings,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Activity,
  Play,
  RotateCw,
  Sun,
  Moon
} from 'lucide-react';
import { BusinessAssumptions } from '../../types/schema';
import { runSystemDiagnostics, DiagnosticResult } from '../../services/diagnostics';

interface SettingsViewProps {
  assumptions: BusinessAssumptions;
  onUpdateAssumptions: (newAssumptions: BusinessAssumptions) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onClearAllData: () => Promise<void>;
  recordsCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  assumptions,
  onUpdateAssumptions,
  isDark,
  onToggleTheme,
  onClearAllData,
  recordsCount
}) => {
  const [activeTab, setActiveTab] = useState<'assumptions' | 'diagnostics' | 'methodology' | 'storage'>('assumptions');
  const [localAssumptions, setLocalAssumptions] = useState<BusinessAssumptions>(assumptions);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticResult[] | null>(null);
  const [isDiagRunning, setIsDiagRunning] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveAssumptions = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAssumptions(localAssumptions);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRunDiagnostics = () => {
    setIsDiagRunning(true);
    setTimeout(() => {
      const res = runSystemDiagnostics();
      setDiagResults(res);
      setIsDiagRunning(false);
    }, 200);
  };

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== 'DELETE ALL DATA') return;
    setIsDeleting(true);
    try {
      await onClearAllData();
      setDeleteConfirmText('');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="font-serif-heading text-2xl font-bold text-slate-900 dark:text-white">
          System Settings, Calculations & Governance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure financial assumptions, verify self-check calculations, review methodology, and manage persistent storage.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[#1E3452] pb-1">
        <button
          onClick={() => setActiveTab('assumptions')}
          className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'assumptions'
              ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Business Assumptions & Levers
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'diagnostics'
              ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Diagnostics Self-Check (Unit Tests)
        </button>

        <button
          onClick={() => setActiveTab('methodology')}
          className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'methodology'
              ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Methodology & How It Works
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'storage'
              ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Data Management & Reset
        </button>
      </div>

      {/* TAB 1: Business Assumptions */}
      {activeTab === 'assumptions' && (
        <form onSubmit={handleSaveAssumptions} className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3452]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Economic Assumptions & Retention Thresholds
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These levers drive net expected revenue value optimization, ROI forecasts, and risk band cutoffs.
              </p>
            </div>
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved successfully</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Cost per Contact (£)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={localAssumptions.costPerContactGbp}
                onChange={(e) => setLocalAssumptions({ ...localAssumptions, costPerContactGbp: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Staff & channel outreach cost per lead</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Expected Save Rate (%)
              </label>
              <input
                type="number"
                step="1"
                min={1}
                max={100}
                value={localAssumptions.saveRatePercent}
                onChange={(e) => setLocalAssumptions({ ...localAssumptions, saveRatePercent: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Estimated % of at-risk customers retained</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Average Gross Margin (%)
              </label>
              <input
                type="number"
                step="1"
                min={1}
                max={100}
                value={localAssumptions.averageMarginPercent}
                onChange={(e) => setLocalAssumptions({ ...localAssumptions, averageMarginPercent: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Telecom service gross margin</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Horizon Length (Months)
              </label>
              <input
                type="number"
                min={1}
                max={36}
                value={localAssumptions.horizonMonths}
                onChange={(e) => setLocalAssumptions({ ...localAssumptions, horizonMonths: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Evaluation window (default 12)</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Critical Risk Cutoff (≥)
              </label>
              <input
                type="number"
                step="0.05"
                min={0.5}
                max={0.95}
                value={localAssumptions.criticalRiskThreshold}
                onChange={(e) => setLocalAssumptions({ ...localAssumptions, criticalRiskThreshold: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default 0.70 (70% probability)</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                High Risk Cutoff (≥)
              </label>
              <input
                type="number"
                step="0.05"
                min={0.3}
                max={0.8}
                value={localAssumptions.highRiskThreshold}
                onChange={(e) => setLocalAssumptions({ ...localAssumptions, highRiskThreshold: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default 0.50 (50% probability)</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Medium Risk Cutoff (≥)
              </label>
              <input
                type="number"
                step="0.05"
                min={0.1}
                max={0.6}
                value={localAssumptions.mediumRiskThreshold}
                onChange={(e) => setLocalAssumptions({ ...localAssumptions, mediumRiskThreshold: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default 0.30 (30% probability; below is Low Risk)</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Reference Evaluation Date
              </label>
              <input
                type="date"
                value={localAssumptions.referenceDate}
                onChange={(e) => setLocalAssumptions({ ...localAssumptions, referenceDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default 07/11/2026</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3452] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Save Business Assumptions
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Diagnostics Self-Check Suite */}
      {activeTab === 'diagnostics' && (
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-[#1E3452]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Formula Self-Check Diagnostic Suite (§11 Acceptance Tests)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Executes automated unit verification against ground-truth mathematical definitions.
              </p>
            </div>
            <button
              onClick={handleRunDiagnostics}
              disabled={isDiagRunning}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 text-[#E5C566] ${isDiagRunning ? 'animate-spin' : ''}`} />
              <span>{isDiagRunning ? 'Running Tests...' : 'Run Diagnostics'}</span>
            </button>
          </div>

          {diagResults ? (
            <div className="space-y-3">
              {diagResults.map((t, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3452] bg-slate-50 dark:bg-[#070F1C] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          t.passed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                        }`}
                      >
                        {t.passed ? 'PASS' : 'FAIL'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {t.name}
                      </span>
                      <span className="text-slate-400 text-[10px]">({t.category})</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {t.details}
                    </p>
                    <div className="text-[11px] text-slate-500 space-x-3">
                      <span>Expected: <strong className="font-mono text-slate-700 dark:text-slate-300">{t.expected}</strong></span>
                      <span>·</span>
                      <span>Observed: <strong className="font-mono text-slate-700 dark:text-slate-300">{t.observed}</strong></span>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {t.executionMs} ms
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-[#1E3452] rounded-xl text-xs text-slate-500">
              Click "Run Diagnostics" to execute the 6 acceptance tests verifying Churn Rate, MRR, Revenue at Risk, Net NPS, Uplift z-test, and ROI formulas.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Methodology */}
      {activeTab === 'methodology' && (
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl p-6 shadow-xs space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <h3 className="font-serif-heading text-lg font-bold text-slate-900 dark:text-white">
            BritConnect Intelligence Architecture & Methodology
          </h3>

          <div className="space-y-4 divide-y divide-slate-100 dark:divide-[#1E3452]/40">
            <div className="pt-2 space-y-1.5">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                1. Strict Data Leakage Prevention (§5.2)
              </h4>
              <p>
                To maintain true model integrity, all post-event columns (Churn Date, Churn Reason, Monthly Revenue at Risk GBP, Customer ID) are unconditionally quarantined and barred from training feature sets. Lifetime Revenue GBP is excluded to prevent encoding customer survival duration directly into predictions.
              </p>
            </div>

            <div className="pt-3 space-y-1.5">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                2. In-Browser Model Training & Probability Calibration (§5.3)
              </h4>
              <p>
                BritConnect runs all training in-browser using pure TypeScript. Stratified 70/15/15 train/validation/test splits ensure no test contamination. Platt scaling on the validation fold calibrates decision probabilities so they can be read accurately as empirical frequencies.
              </p>
            </div>

            <div className="pt-3 space-y-1.5">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                3. Grounded AI & Grounded Tool Calling (§8)
              </h4>
              <p>
                Gemini API calls never compute or invent figures. All portfolio KPIs and segment metrics are computed by deterministic JavaScript functions over the local IndexedDB database; the LLM strictly translates and structures the findings into executive prose.
              </p>
            </div>

            <div className="pt-3 space-y-1.5">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                4. Incremental Uplift & Holdout Control Groups (§7.4)
              </h4>
              <p>
                Campaigns enforce an uncontacted holdout control group (10-20%) stratified by risk tier. Uplift is computed as retention(treated) minus retention(control), verified with a two-proportion hypothesis z-test and 95% confidence intervals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Data Management & Reset */}
      {activeTab === 'storage' && (
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Data Storage Management & Complete Reset
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All datasets, trained models, scores, campaigns, and chat histories are persisted locally in browser IndexedDB.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452] space-y-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-white block">Active Storage Footprint</span>
            <p className="text-slate-600 dark:text-slate-400">
              Active Customer Records: <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">{recordsCount.toLocaleString()}</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Database Engine: <strong className="font-mono text-slate-800 dark:text-slate-200">IndexedDB (idb v8)</strong>
            </p>
          </div>

          {/* Destructive Clear Zone */}
          <div className="p-5 rounded-xl border border-red-200 dark:border-red-950/80 bg-red-50/50 dark:bg-red-950/20 space-y-3">
            <h4 className="text-xs font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Danger Zone: Permanent Reset of All Application Data</span>
            </h4>
            <p className="text-xs text-red-800/80 dark:text-red-300/80">
              This action purges all customer records, validation reports, trained models, campaigns, and chat history from local IndexedDB.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <input
                type="text"
                placeholder="Type 'DELETE ALL DATA' to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full sm:w-64 bg-white dark:bg-[#0B1F3A] border border-red-300 dark:border-red-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== 'DELETE ALL DATA' || isDeleting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                {isDeleting ? 'Purging Storage...' : 'Permanently Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
