import React, { useState } from 'react';
import {
  Cpu,
  ShieldCheck,
  RotateCw,
  Award,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Scale
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { ChartCard } from '../common/ChartCard';
import { ModelCard, MLAlgorithm, CustomerRecord, BusinessAssumptions } from '../../types/schema';
import { LEAKAGE_COLUMNS, SAFE_MODEL_FEATURES } from '../../ml/featureEngineering';

interface ModelStudioViewProps {
  activeModel: ModelCard | null;
  allModels: ModelCard[];
  onTrainModel: (algorithm: MLAlgorithm, selectedFeatures: string[]) => Promise<void>;
  onSelectChampion: (modelId: string) => void;
  assumptions: BusinessAssumptions;
  recordsCount: number;
}

export const ModelStudioView: React.FC<ModelStudioViewProps> = ({
  activeModel,
  allModels,
  onTrainModel,
  onSelectChampion,
  assumptions,
  recordsCount
}) => {
  const [selectedAlgo, setSelectedAlgo] = useState<MLAlgorithm>('Gradient Boosted Trees');
  const [isTraining, setIsTraining] = useState(false);
  const [activeFeatureKeys, setActiveFeatureKeys] = useState<string[]>(() =>
    SAFE_MODEL_FEATURES.map(f => f.name)
  );
  const [threshold, setThreshold] = useState<number>(0.40);
  const [activeTab, setActiveTab] = useState<'metrics' | 'curves' | 'threshold' | 'card' | 'fairness'>('metrics');

  const handleRunTraining = async () => {
    setIsTraining(true);
    try {
      await onTrainModel(selectedAlgo, activeFeatureKeys);
    } finally {
      setIsTraining(false);
    }
  };

  const toggleFeature = (name: string) => {
    if (activeFeatureKeys.includes(name)) {
      if (activeFeatureKeys.length > 5) {
        setActiveFeatureKeys(activeFeatureKeys.filter(k => k !== name));
      }
    } else {
      setActiveFeatureKeys([...activeFeatureKeys, name]);
    }
  };

  // Expected Value Calculation at slider threshold
  const expectedValueCalc = (t: number) => {
    if (!activeModel) return { netValue: 0, customersFlagged: 0, precision: 0, recall: 0 };
    // Find closest point on PR curve
    const closest = activeModel.metrics.prCurve.find(p => p.threshold !== undefined && Math.abs(p.threshold - t) < 0.05) ||
      activeModel.metrics.prCurve[Math.floor(activeModel.metrics.prCurve.length / 2)];

    const prec = closest ? closest.y : activeModel.metrics.precision;
    const rec = closest ? closest.x : activeModel.metrics.recall;

    const totalActive = Math.round(recordsCount * 0.8);
    const flagged = Math.round(totalActive * (0.1 + (1 - t) * 0.4));
    const truePositives = Math.round(flagged * prec);

    const retainedSaves = Math.round(truePositives * (assumptions.saveRatePercent / 100));
    const grossRetained = retainedSaves * 42.0 * assumptions.horizonMonths;
    const marginRetained = grossRetained * (assumptions.averageMarginPercent / 100);
    const campaignCost = flagged * assumptions.costPerContactGbp;
    const netValue = Math.round(marginRetained - campaignCost);

    return {
      netValue,
      customersFlagged: flagged,
      precision: +(prec * 100).toFixed(1),
      recall: +(rec * 100).toFixed(1)
    };
  };

  const currentThreshMetrics = expectedValueCalc(threshold);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Training Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-slate-900 dark:text-white">
            Model Studio & In-Browser Machine Learning
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Train, evaluate, and calibrate client-side algorithms with zero data leakage and stratified cross-validation.
          </p>
        </div>

        {/* Algorithm selection & Train button */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedAlgo}
            onChange={(e) => setSelectedAlgo(e.target.value as MLAlgorithm)}
            disabled={isTraining}
            className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C9A227] cursor-pointer"
          >
            <option value="Gradient Boosted Trees">Gradient Boosted Trees (Recommended)</option>
            <option value="Random Forest">Random Forest (Ensemble Trees)</option>
            <option value="Logistic Regression">Logistic Regression (L2 Baseline)</option>
            <option value="Decision Tree">Decision Tree (High Interpretability)</option>
          </select>

          <button
            onClick={handleRunTraining}
            disabled={isTraining || recordsCount === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#E5C566] ${isTraining ? 'animate-spin' : ''}`} />
            <span>{isTraining ? 'Training In-Browser...' : 'Train Model'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Leakage Guard Notice */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <span>Mandatory Leakage Guard Active</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-200 uppercase font-mono">
                Safe
              </span>
            </h4>
            <p className="text-emerald-800/80 dark:text-emerald-300/80 text-[11px] mt-0.5">
              Strictly excludes post-churn and target leakage fields: {LEAKAGE_COLUMNS.map(l => l.key).join(', ')}.
              Evaluated exclusively on stratified held-out test splits.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
          {activeFeatureKeys.length} / {SAFE_MODEL_FEATURES.length} features enabled
        </span>
      </div>

      {/* Active Champion Model Strip */}
      {activeModel ? (
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3452]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B1F3A] to-[#12305A] text-[#E5C566] flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeModel.algorithm}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#C9A227] text-[#0B1F3A] uppercase tracking-wider">
                    Champion Model
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Trained: {new Date(activeModel.trainedAt).toLocaleString('en-GB')} · {activeModel.rowCount.toLocaleString()} records · Seed {activeModel.hyperparameters.seed}
                </p>
              </div>
            </div>

            {/* Models Switcher */}
            {allModels.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Champion:</span>
                <select
                  value={activeModel.id}
                  onChange={(e) => onSelectChampion(e.target.value)}
                  className="bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  {allModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.algorithm} (PR-AUC: {m.metrics.prAuc})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Studio Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[#1E3452] pb-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'metrics'
                  ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Held-Out Test Metrics
            </button>
            <button
              onClick={() => setActiveTab('curves')}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'curves'
                  ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ROC, PR & Calibration Curves
            </button>
            <button
              onClick={() => setActiveTab('threshold')}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'threshold'
                  ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Interactive Threshold & Value Optimizer
            </button>
            <button
              onClick={() => setActiveTab('fairness')}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'fairness'
                  ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Demographic Fairness Audit
            </button>
            <button
              onClick={() => setActiveTab('card')}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'card'
                  ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Model Card & Governance
            </button>
          </div>

          {/* TAB 1: Metrics Table */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452]">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">PR-AUC</span>
                  <div className="text-xl font-bold font-mono-tabular text-[#1D4C8F] dark:text-[#E5C566] mt-0.5">
                    {activeModel.metrics.prAuc}
                  </div>
                  <span className="text-[10px] text-slate-400">CV: {activeModel.metrics.cvMeanPrAuc} ± {activeModel.metrics.cvStdPrAuc}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452]">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">ROC-AUC</span>
                  <div className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                    {activeModel.metrics.rocAuc}
                  </div>
                  <span className="text-[10px] text-slate-400">CV: {activeModel.metrics.cvMeanRocAuc} ± {activeModel.metrics.cvStdRocAuc}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452]">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">F1-Score</span>
                  <div className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                    {activeModel.metrics.f1}
                  </div>
                  <span className="text-[10px] text-slate-400">Precision: {activeModel.metrics.precision}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452]">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Recall</span>
                  <div className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                    {activeModel.metrics.recall}
                  </div>
                  <span className="text-[10px] text-slate-400">Specificity: {activeModel.metrics.specificity}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452]">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Top Decile Lift</span>
                  <div className="text-xl font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {activeModel.metrics.topDecileLift}x
                  </div>
                  <span className="text-[10px] text-slate-400">vs random outreach</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452]">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Brier Score</span>
                  <div className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                    {activeModel.metrics.brierScore}
                  </div>
                  <span className="text-[10px] text-slate-400">Log-loss: {activeModel.metrics.logLoss}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452]">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Gini Coeff</span>
                  <div className="text-xl font-bold font-mono-tabular text-[#C9A227] mt-0.5">
                    {activeModel.metrics.gini}
                  </div>
                  <span className="text-[10px] text-slate-400">2×AUC − 1</span>
                </div>
              </div>

              {/* Confusion Matrix Display */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3452] space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Confusion Matrix (Held-out Test Fold, Threshold = 0.40)
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs max-w-md">
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">True Negatives (Active Kept)</span>
                    <div className="text-lg font-bold font-mono-tabular text-emerald-800 dark:text-emerald-200">
                      {activeModel.metrics.confusionMatrix.trueNegative}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                    <span className="text-[10px] text-red-700 dark:text-red-300 font-semibold">False Positives (False Alarm)</span>
                    <div className="text-lg font-bold font-mono-tabular text-red-800 dark:text-red-200">
                      {activeModel.metrics.confusionMatrix.falsePositive}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">False Negatives (Missed Churn)</span>
                    <div className="text-lg font-bold font-mono-tabular text-amber-800 dark:text-amber-200">
                      {activeModel.metrics.confusionMatrix.falseNegative}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">True Positives (Correctly Flagged)</span>
                    <div className="text-lg font-bold font-mono-tabular text-emerald-800 dark:text-emerald-200">
                      {activeModel.metrics.confusionMatrix.truePositive}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Curves */}
          {activeTab === 'curves' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ROC Curve */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3452] space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  ROC Curve (AUC: {activeModel.metrics.rocAuc})
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeModel.metrics.rocCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="x" unit="" domain={[0, 1]} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis domain={[0, 1]} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip formatter={(v) => [v, 'TPR']} labelFormatter={(v) => `FPR: ${v}`} />
                      <Line type="monotone" dataKey="y" stroke="#0B1F3A" strokeWidth={2} dot={false} />
                      <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#94a3b8" strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* PR Curve */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3452] space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Precision-Recall (PR-AUC: {activeModel.metrics.prAuc})
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeModel.metrics.prCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="x" domain={[0, 1]} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis domain={[0, 1]} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip formatter={(v) => [v, 'Precision']} labelFormatter={(v) => `Recall: ${v}`} />
                      <Line type="monotone" dataKey="y" stroke="#C9A227" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Calibration Reliability Curve */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3452] space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Calibration Reliability Curve
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeModel.metrics.calibrationCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="meanPredicted" domain={[0, 1]} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis domain={[0, 1]} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip formatter={(v) => [v, 'Observed']} labelFormatter={(v) => `Predicted: ${v}`} />
                      <Line type="monotone" dataKey="observedFrequency" stroke="#1D4C8F" strokeWidth={2} dot={{ r: 3 }} />
                      <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#94a3b8" strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Threshold Tuning & Value Optimizer */}
          {activeTab === 'threshold' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452] p-5 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Decision Threshold Tuning & Expected Net Value Optimization
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Move the slider to observe real-time trade-offs between precision, recall, and expected financial yield.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Selected Cutoff</span>
                    <div className="text-xl font-bold font-mono-tabular text-[#0B1F3A] dark:text-[#E5C566]">
                      {(threshold * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0.10"
                  max="0.85"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#C9A227]"
                />

                {/* Metric results at threshold */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white dark:bg-[#0B1F3A] rounded-lg border border-slate-200 dark:border-[#1E3452]">
                    <span className="text-[10px] text-slate-400 uppercase">Customers Flagged</span>
                    <div className="text-lg font-bold font-mono-tabular text-slate-900 dark:text-white">
                      {currentThreshMetrics.customersFlagged.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#0B1F3A] rounded-lg border border-slate-200 dark:border-[#1E3452]">
                    <span className="text-[10px] text-slate-400 uppercase">Precision (True Churn %)</span>
                    <div className="text-lg font-bold font-mono-tabular text-[#1D4C8F] dark:text-[#E5C566]">
                      {currentThreshMetrics.precision}%
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#0B1F3A] rounded-lg border border-slate-200 dark:border-[#1E3452]">
                    <span className="text-[10px] text-slate-400 uppercase">Recall (Churn Captured)</span>
                    <div className="text-lg font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                      {currentThreshMetrics.recall}%
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#0B1F3A] rounded-lg border border-slate-200 dark:border-[#1E3452]">
                    <span className="text-[10px] text-slate-400 uppercase">Projected Net Value</span>
                    <div className="text-lg font-bold font-mono-tabular text-[#C9A227]">
                      £{currentThreshMetrics.netValue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Fairness Audit */}
          {activeTab === 'fairness' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Scale className="w-4 h-4 text-[#C9A227]" />
                <span>Auditing model PR-AUC parity across protected and demographic classifications in held-out folds.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3452] space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Performance Parity by Customer Segment
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-[#1E3452]/40 text-xs">
                    {Object.entries(activeModel.fairnessAudit.bySegment).map(([seg, stats]) => (
                      <div key={seg} className="flex justify-between py-2">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{seg} ({stats.count} eval)</span>
                        <div className="space-x-4">
                          <span className="text-slate-500">Churn Rate: {(stats.churnRate * 100).toFixed(1)}%</span>
                          <span className="font-mono-tabular font-bold text-emerald-600 dark:text-emerald-400">PR-AUC: {stats.testPrAuc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3452] space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Performance Parity by UK Nation
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-[#1E3452]/40 text-xs">
                    {Object.entries(activeModel.fairnessAudit.byNation).map(([nat, stats]) => (
                      <div key={nat} className="flex justify-between py-2">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{nat} ({stats.count} eval)</span>
                        <div className="space-x-4">
                          <span className="text-slate-500">Churn Rate: {(stats.churnRate * 100).toFixed(1)}%</span>
                          <span className="font-mono-tabular font-bold text-emerald-600 dark:text-emerald-400">PR-AUC: {stats.testPrAuc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Model Card */}
          {activeTab === 'card' && (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3452] space-y-4 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Official BritConnect Model Card
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>Algorithm:</strong> {activeModel.algorithm}</p>
                  <p><strong>Training Date:</strong> {new Date(activeModel.trainedAt).toLocaleString('en-GB')}</p>
                  <p><strong>Stratified Split:</strong> {activeModel.hyperparameters.trainTestSplit} with 5-Fold Cross Validation</p>
                  <p><strong>Probability Calibration:</strong> {activeModel.hyperparameters.calibration}</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Class Imbalance:</strong> Balanced loss weights applied</p>
                  <p><strong>Known Limitations:</strong> Snapshot problem limitation noted for recent churned customers.</p>
                  <p><strong>Excluded Leakage Fields:</strong> {LEAKAGE_COLUMNS.map(l => l.key).join(', ')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl">
          <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No Trained Model in Current Session
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            Select an algorithm and click "Train Model" above to train an in-browser classifier on the active dataset.
          </p>
        </div>
      )}
    </div>
  );
};
