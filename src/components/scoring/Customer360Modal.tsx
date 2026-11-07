import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Calendar,
  CreditCard,
  PhoneCall,
  Activity,
  Sliders,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { ScoredCustomer, CustomerRecord } from '../../types/schema';
import { TrainedModelWeights } from '../../ml/models';
import { simulateCustomerWhatIf, WhatIfLevers, WhatIfSimulationResult } from '../../ml/scoring';

interface Customer360ModalProps {
  customer: ScoredCustomer;
  model: TrainedModelWeights | null;
  onClose: () => void;
  onGeneratePlan: (customer: ScoredCustomer) => void;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  customer,
  model,
  onClose,
  onGeneratePlan
}) => {
  const r = customer.record;

  // What-If levers state
  const [levers, setLevers] = useState<WhatIfLevers>({
    additionalDiscountPercent: 0,
    extendContractMonths: 0,
    enableAutoRenew: false,
    resolveComplaints: false,
    resolveOutages: false,
    eliminateOverages: false
  });

  // Run simulation if model weights available
  const simResult: WhatIfSimulationResult | null = model
    ? simulateCustomerWhatIf(r, model, levers)
    : null;

  const currentProb = simResult ? simResult.simulatedProbability : customer.churnProbability;
  const currentTier = simResult ? simResult.simulatedTier : customer.riskTier;
  const savings = simResult ? simResult.annualSavingsGbp : 0;

  const daysToExpiry = r.contractEndDate
    ? Math.round((new Date(r.contractEndDate).getTime() - new Date('2026-11-07').getTime()) / (24 * 3600 * 1000))
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E3452] flex items-center justify-between bg-slate-50 dark:bg-[#0B1F3A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1F3A] text-white flex items-center justify-center font-bold text-sm">
              {r.customerSegment === 'Small Business' ? 'B2B' : 'B2C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {customer.id}
                </h2>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    currentTier === 'Critical'
                      ? 'bg-red-100 text-[#4D0612] dark:bg-red-950/80 dark:text-red-200'
                      : currentTier === 'High'
                      ? 'bg-red-50 text-[#7A0C1E] dark:bg-red-900/40 dark:text-red-300'
                      : currentTier === 'Medium'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}
                >
                  {currentTier} Risk Tier
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {r.city}, {r.ukNation} · {r.planName} ({r.serviceType}) · Joined {r.joinDate} ({r.tenureMonths}m tenure)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onGeneratePlan(customer)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5C566]" />
              <span>Generate AI Retention Plan</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Key Metric Score Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Churn Probability</span>
              <div className="text-xl font-bold font-mono-tabular text-[#7A0C1E] dark:text-[#E5C566] mt-0.5">
                {(currentProb * 100).toFixed(1)}%
              </div>
              {simResult && simResult.probabilityDelta !== 0 && (
                <span className="text-[10px] text-emerald-600 font-bold">
                  {simResult.probabilityDelta > 0 ? '+' : ''}{(simResult.probabilityDelta * 100).toFixed(1)}% delta
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Effective Monthly Bill</span>
              <div className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                £{customer.effectiveMonthlyCharge.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Gross £{r.monthlyChargeGbp.toFixed(2)}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Monthly Revenue at Risk</span>
              <div className="text-xl font-bold font-mono-tabular text-[#C9A227] mt-0.5">
                £{(currentProb * customer.effectiveMonthlyCharge).toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Probability × Monthly Bill</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">12-Month Expected Loss</span>
              <div className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                £{(currentProb * customer.effectiveMonthlyCharge * 12).toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Annual exposure</span>
            </div>
          </div>

          {/* Customer 360 Grid: Demographics, Contract, Service Health, Billing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Contract & Agreement */}
            <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Contract & Term Status</span>
              </h4>
              <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-[#1E3452]/40">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Contract Arrangement:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{r.contractType}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Contract Term End:</span>
                  <span className={`font-semibold ${daysToExpiry <= 30 ? 'text-[#7A0C1E] font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                    {r.contractEndDate || 'Rolling'} ({daysToExpiry} days remaining)
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Automatic Renewal:</span>
                  <span className={`font-semibold ${r.autoRenew === 'No' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {r.autoRenew}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Acquisition Channel:</span>
                  <span className="text-slate-700 dark:text-slate-300">{r.acquisitionChannel}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Service Health & Sentiment */}
            <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#1D4C8F]" />
                <span>Service Experience & Advocacy</span>
              </h4>
              <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-[#1E3452]/40">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Satisfaction Score (CSAT):</span>
                  <span className={`font-bold font-mono-tabular ${r.satisfactionScore110 <= 4 ? 'text-[#7A0C1E]' : 'text-slate-800 dark:text-slate-200'}`}>
                    {r.satisfactionScore110} / 10
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">NPS Advocacy Score:</span>
                  <span className="font-bold font-mono-tabular text-slate-800 dark:text-slate-200">{r.npsScore}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Complaints (Last 12M):</span>
                  <span className={`font-semibold ${r.complaints12m >= 2 ? 'text-[#7A0C1E]' : 'text-slate-700 dark:text-slate-300'}`}>
                    {r.complaints12m} complaints ({r.supportTickets12m} total tickets)
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Outages & Resolution:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {r.networkOutages12m} outages · {r.averageResolutionHours}h avg resolution
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Local Explainability Waterfall / Driver Decomposition */}
          <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Local Risk Factor Attribution (SHAP-style Waterfall)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Decomposing baseline portfolio probability ({Math.round(customer.waterfallBaseline * 100)}%) into individual risk contributors
                </p>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-[#12305A] px-2 py-0.5 rounded">
                Model-Agnostic Attribution
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {customer.topDrivers.map((driver, dIdx) => {
                const isRisk = driver.impactPoints > 0;
                return (
                  <div key={dIdx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-[#070F1C] border border-slate-100 dark:border-[#1E3452]">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isRisk ? 'text-[#7A0C1E]' : 'text-emerald-600'}`}>
                        {isRisk ? '▲' : '▼'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {driver.label}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ({driver.plainEnglish})
                      </span>
                    </div>

                    <span className={`font-mono-tabular font-bold ${isRisk ? 'text-[#7A0C1E]' : 'text-emerald-600'}`}>
                      {driver.impactPoints > 0 ? `+${driver.impactPoints}` : driver.impactPoints} pts
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Note: Driver impact points indicate statistical predictive association and risk contribution; they do not imply proven causal certainty.
            </p>
          </div>

          {/* Real-Time What-If Simulator */}
          <div className="bg-gradient-to-br from-slate-50 to-white dark:from-[#0D1C30] dark:to-[#12305A]/40 border border-[#C9A227]/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#C9A227]" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Real-Time Retention What-If Simulator
                </h4>
              </div>

              {savings > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <span>Projected Annual Saving: £{savings.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Lever 1: Retention Discount */}
              <div className="p-3 rounded-lg bg-white dark:bg-[#0B1F3A] border border-slate-200 dark:border-[#1E3452] space-y-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Apply Retention Discount</span>
                <select
                  value={levers.additionalDiscountPercent}
                  onChange={(e) => setLevers({ ...levers, additionalDiscountPercent: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded px-2 py-1 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value={0}>No additional discount (0%)</option>
                  <option value={10}>10% Retention Discount</option>
                  <option value={20}>20% Save Desk Discount</option>
                  <option value={30}>30% VIP Retention Discount</option>
                </select>
              </div>

              {/* Lever 2: Contract Extension */}
              <div className="p-3 rounded-lg bg-white dark:bg-[#0B1F3A] border border-slate-200 dark:border-[#1E3452] space-y-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Extend Contract Term</span>
                <select
                  value={levers.extendContractMonths}
                  onChange={(e) => setLevers({ ...levers, extendContractMonths: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded px-2 py-1 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value={0}>Maintain current term</option>
                  <option value={12}>Renew for 12 Months</option>
                  <option value={18}>Renew for 18 Months</option>
                  <option value={24}>Lock in 24 Months</option>
                </select>
              </div>

              {/* Lever 3: Auto-Renew */}
              <div className="p-3 rounded-lg bg-white dark:bg-[#0B1F3A] border border-slate-200 dark:border-[#1E3452] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block">Enable Auto-Renew</span>
                  <span className="text-[10px] text-slate-400">Secure seamless renewal</span>
                </div>
                <input
                  type="checkbox"
                  checked={levers.enableAutoRenew}
                  onChange={(e) => setLevers({ ...levers, enableAutoRenew: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Lever 4: Complaint Resolution */}
              <div className="p-3 rounded-lg bg-white dark:bg-[#0B1F3A] border border-slate-200 dark:border-[#1E3452] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block">Resolve Open Complaints</span>
                  <span className="text-[10px] text-slate-400">Close ticket backlog</span>
                </div>
                <input
                  type="checkbox"
                  checked={levers.resolveComplaints}
                  onChange={(e) => setLevers({ ...levers, resolveComplaints: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Lever 5: Outage Intervention */}
              <div className="p-3 rounded-lg bg-white dark:bg-[#0B1F3A] border border-slate-200 dark:border-[#1E3452] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block">Network Stability Fix</span>
                  <span className="text-[10px] text-slate-400">Router replacement</span>
                </div>
                <input
                  type="checkbox"
                  checked={levers.resolveOutages}
                  onChange={(e) => setLevers({ ...levers, resolveOutages: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Lever 6: Waive Overages */}
              <div className="p-3 rounded-lg bg-white dark:bg-[#0B1F3A] border border-slate-200 dark:border-[#1E3452] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block">Waive Overages</span>
                  <span className="text-[10px] text-slate-400">Upgrade data allowance</span>
                </div>
                <input
                  type="checkbox"
                  checked={levers.eliminateOverages}
                  onChange={(e) => setLevers({ ...levers, eliminateOverages: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
