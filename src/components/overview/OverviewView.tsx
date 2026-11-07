import React from 'react';
import {
  Upload,
  CheckCircle2,
  Cpu,
  Sparkles,
  ArrowRight,
  TrendingDown,
  AlertCircle,
  Users,
  Shield,
  FileSpreadsheet,
  Calculator
} from 'lucide-react';
import { NavPage } from '../common/Sidebar';
import { CustomerRecord, ModelCard, ValidationReport } from '../../types/schema';
import { ComputedKPIs } from '../../services/deterministicAnalytics';

interface OverviewViewProps {
  onNavigate: (page: NavPage) => void;
  records: CustomerRecord[];
  kpis: ComputedKPIs | null;
  activeModel: ModelCard | null;
  validationReport: ValidationReport | null;
  onLoadDemoData: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  records,
  kpis,
  activeModel,
  validationReport,
  onLoadDemoData
}) => {
  const hasData = records.length > 0;
  const hasModel = activeModel !== null;
  const hasValidation = validationReport !== null;

  const steps = [
    {
      num: 1,
      title: 'Upload Customer Data',
      desc: 'Ingest .xlsx, .csv, or .json with auto-column mapping for all 38 telecom fields.',
      completed: hasData,
      active: !hasData,
      page: 'upload' as NavPage,
      actionText: hasData ? 'Manage Data' : 'Upload File'
    },
    {
      num: 2,
      title: 'Automated Cleaning & Quality',
      desc: 'Audit missingness, range checks, and apply transparent deduplication & imputation.',
      completed: hasValidation,
      active: hasData && !hasValidation,
      page: 'quality' as NavPage,
      actionText: 'Review Quality'
    },
    {
      num: 3,
      title: 'Train Leakage-Safe Models',
      desc: 'Train GBDT, Random Forest, or Logistic Regression with stratified cross-validation.',
      completed: hasModel,
      active: hasData && !hasModel,
      page: 'models' as NavPage,
      actionText: hasModel ? 'View Models' : 'Train Model'
    },
    {
      num: 4,
      title: 'Retention Action & Campaigns',
      desc: 'Score active customers, explore Customer 360, and execute randomized holdout campaigns.',
      completed: hasModel,
      active: hasModel,
      page: 'dashboard' as NavPage,
      actionText: 'Explore Dashboard'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner with BritConnect Navy & Gold styling */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1F3A] via-[#12305A] to-[#1D4C8F] p-8 md:p-10 text-white shadow-md border border-[#1E3452]">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#C9A227]/20 border border-[#C9A227]/50 text-[#E5C566]">
            <Shield className="w-3.5 h-3.5" />
            <span>UK Telecommunications Enterprise Intelligence</span>
          </div>

          <h1 className="font-serif-heading text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            BritConnect Customer Churn & Retention Intelligence
          </h1>

          <p className="text-sm md:text-base text-slate-200 leading-relaxed max-w-2xl">
            Empowering retention teams with client-side machine learning, strict leakage prevention,
            individual customer explainability, and evidence-based AI intervention playbooks.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {!hasData ? (
              <>
                <button
                  onClick={() => onNavigate('upload')}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold text-[#0B1F3A] bg-[#C9A227] hover:bg-[#E5C566] transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Customer Dataset</span>
                </button>
                <button
                  onClick={onLoadDemoData}
                  className="px-5 py-2.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#E5C566]" />
                  <span>Load BritConnect Demonstration Dataset (1,200 Accounts)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-[#0B1F3A] bg-[#C9A227] hover:bg-[#E5C566] transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>Executive Dashboard</span>
                </button>
                <button
                  onClick={() => onNavigate('executive-summary')}
                  className="px-4 py-2.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#E5C566]" />
                  <span>Detailed Executive Summary</span>
                </button>
                <button
                  onClick={() => onNavigate('risk-calculator')}
                  className="px-4 py-2.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-[#E5C566]" />
                  <span>Risk Score Calculator</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Subtle decorative background watermark */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center font-serif-heading font-black text-[180px] text-white">
          BC
        </div>
      </div>

      {/* 4-Step Guided Stepper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Retention Workflow Roadmap
          </h2>
          <span className="text-xs text-slate-500">
            {hasModel ? 'Fully Operational' : hasData ? 'Ready for Training' : 'Awaiting Ingestion'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                step.completed
                  ? 'bg-white dark:bg-[#0D1C30] border-emerald-200 dark:border-emerald-900/40 shadow-xs'
                  : step.active
                  ? 'bg-white dark:bg-[#0D1C30] border-[#C9A227] ring-1 ring-[#C9A227]/30 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#070F1C] border-slate-200 dark:border-[#1E3452] opacity-70'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.completed
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : step.active
                        ? 'bg-[#C9A227] text-[#0B1F3A]'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {step.completed ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      step.completed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : step.active
                        ? 'text-[#C9A227] font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.completed ? 'Completed' : step.active ? 'Current Action' : 'Upcoming'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                    {step.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#1E3452]">
                <button
                  onClick={() => onNavigate(step.page)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    step.active
                      ? 'bg-[#0B1F3A] hover:bg-[#12305A] text-white font-semibold'
                      : 'bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 dark:hover:bg-[#1D4C8F] text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{step.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Risk Score & Cohort Breakdown (when data populated) */}
      {hasData && kpis && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Customer Risk Score Cohorts & Revenue Exposure
            </h2>
            <span className="text-xs text-slate-500">
              Avg Risk: <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">{kpis.portfolioAvgRiskScore}%</strong> • {kpis.activeCustomers.toLocaleString()} Active Accounts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Critical */}
            <div className="bg-white dark:bg-[#0D1C30] border border-red-200 dark:border-[#4D0612] p-4.5 rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4D0612] dark:text-red-400">Critical Risk (≥70%)</span>
                <span className="text-[11px] font-semibold text-slate-500">{kpis.criticalSharePercent}% base</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono-tabular text-[#4D0612] dark:text-red-300">
                  {kpis.customersInCriticalRisk.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">accounts</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#1E3452] flex items-center justify-between text-xs">
                <span className="text-slate-500">Exposed:</span>
                <span className="font-bold font-mono-tabular text-[#7A0C1E] dark:text-red-400">£{kpis.criticalRevenueAtRiskGbp.toLocaleString()}/mo</span>
              </div>
            </div>

            {/* High */}
            <div className="bg-white dark:bg-[#0D1C30] border border-orange-200 dark:border-[#A3152B]/40 p-4.5 rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A3152B] dark:text-orange-400">High Risk (50–69%)</span>
                <span className="text-[11px] font-semibold text-slate-500">{kpis.highSharePercent}% base</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono-tabular text-[#A3152B] dark:text-orange-300">
                  {kpis.customersInHighRisk.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">accounts</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#1E3452] flex items-center justify-between text-xs">
                <span className="text-slate-500">Exposed:</span>
                <span className="font-bold font-mono-tabular text-[#A3152B] dark:text-orange-400">£{kpis.highRevenueAtRiskGbp.toLocaleString()}/mo</span>
              </div>
            </div>

            {/* Medium */}
            <div className="bg-white dark:bg-[#0D1C30] border border-amber-200 dark:border-[#C9A227]/40 p-4.5 rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C9A227] dark:text-[#E5C566]">Medium Risk (30–49%)</span>
                <span className="text-[11px] font-semibold text-slate-500">{kpis.mediumSharePercent}% base</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono-tabular text-[#C9A227] dark:text-[#E5C566]">
                  {kpis.customersInMediumRisk.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">accounts</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#1E3452] flex items-center justify-between text-xs">
                <span className="text-slate-500">Exposed:</span>
                <span className="font-bold font-mono-tabular text-[#C9A227] dark:text-[#E5C566]">£{kpis.mediumRevenueAtRiskGbp.toLocaleString()}/mo</span>
              </div>
            </div>

            {/* Low */}
            <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4.5 rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B1F3A] dark:text-white">Low Risk (&lt;30%)</span>
                <span className="text-[11px] font-semibold text-slate-500">{kpis.lowSharePercent}% base</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono-tabular text-[#0B1F3A] dark:text-white">
                  {kpis.customersInLowRisk.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">accounts</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#1E3452] flex items-center justify-between text-xs">
                <span className="text-slate-500">Protected MRR:</span>
                <span className="font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                  £{(kpis.effectiveMonthlyRecurringRevenueGbp - kpis.modelRevenueAtRiskGbp > 0 ? (kpis.effectiveMonthlyRecurringRevenueGbp - kpis.modelRevenueAtRiskGbp) : 0).toLocaleString()}/mo
                </span>
              </div>
            </div>
          </div>

          {/* Telemetry Core Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4.5 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Portfolio Churn Rate</span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-tabular text-[#7A0C1E] dark:text-[#E5C566]">
                  {kpis.churnRatePercent}%
                </span>
                <span className="text-xs text-slate-400">evaluated</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">{kpis.churnRateDenominator}</p>
            </div>

            <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4.5 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Monthly Risk Exposure</span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-tabular text-[#C9A227]">
                  £{kpis.modelRevenueAtRiskGbp.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">12M Expected Loss: £{kpis.expected12MonthLossGbp.toLocaleString()}</p>
            </div>

            <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4.5 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Active MRR</span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-tabular text-[#0B1F3A] dark:text-white">
                  £{kpis.monthlyRecurringRevenueGbp.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Effective (Net): £{kpis.effectiveMonthlyRecurringRevenueGbp.toLocaleString()}</p>
            </div>

            <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4.5 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Contract Expiries (30 Days)</span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-tabular text-[#1D4C8F] dark:text-[#E5C566]">
                  {kpis.contractsExpiring30dCount}
                </span>
                <span className="text-xs text-slate-400">accounts cliff</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{kpis.contractsExpiring60dCount} expiring within 60 days</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
