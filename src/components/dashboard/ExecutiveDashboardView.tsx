import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  RotateCw,
  HelpCircle,
  FileText,
  Calculator,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { ChartCard } from '../common/ChartCard';
import { CustomerRecord, ScoredCustomer } from '../../types/schema';
import { ComputedKPIs, groupMetricBy } from '../../services/deterministicAnalytics';

interface ExecutiveDashboardViewProps {
  kpis: ComputedKPIs;
  records: CustomerRecord[];
  scoredCustomers: ScoredCustomer[];
  aiSummary: string[];
  onRegenerateAiSummary: () => void;
  isAiLoading: boolean;
  onNavigateToSummary?: () => void;
  onNavigateToCalculator?: () => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  kpis,
  records,
  scoredCustomers,
  aiSummary,
  onRegenerateAiSummary,
  isAiLoading,
  onNavigateToSummary,
  onNavigateToCalculator
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(aiSummary.join('\n\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Churn by Segment
  const segmentData = useMemo(() => {
    return groupMetricBy(records, scoredCustomers, 'customerSegment', 'churnRate');
  }, [records, scoredCustomers]);

  // 2. Churn by Service Type
  const serviceData = useMemo(() => {
    return groupMetricBy(records, scoredCustomers, 'serviceType', 'churnRate');
  }, [records, scoredCustomers]);

  // 3. Churn by Contract Type
  const contractData = useMemo(() => {
    return groupMetricBy(records, scoredCustomers, 'contractType', 'churnRate');
  }, [records, scoredCustomers]);

  // 4. Churn by Tenure Bucket
  const tenureData = useMemo(() => {
    const list = groupMetricBy(records, scoredCustomers, 'tenureBucket', 'churnRate');
    // Sort in natural chronological order
    const order = ['0-6m', '7-12m', '13-24m', '25-48m', '49m+'];
    return list.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  }, [records, scoredCustomers]);

  // 5. Risk Tier Distribution (Donut derived directly from kpis)
  const tierData = useMemo(() => {
    return [
      { name: 'Critical (≥70%)', value: kpis.customersInCriticalRisk, share: kpis.criticalSharePercent, color: '#4D0612' },
      { name: 'High (50-69%)', value: kpis.customersInHighRisk, share: kpis.highSharePercent, color: '#A3152B' },
      { name: 'Medium (30-49%)', value: kpis.customersInMediumRisk, share: kpis.mediumSharePercent, color: '#C9A227' },
      { name: 'Low (<30%)', value: kpis.customersInLowRisk, share: kpis.lowSharePercent, color: '#0B1F3A' }
    ];
  }, [kpis]);

  // 6. Top Churn Reasons (Ranked Bar)
  const churnReasonsData = useMemo(() => {
    const reasonsMap: Record<string, number> = {};
    const churned = records.filter(r => r.churnFlag === 1 || r.churnStatus === 'Churned');
    for (const r of churned) {
      const reason = r.churnReason || 'Unspecified';
      reasonsMap[reason] = (reasonsMap[reason] || 0) + 1;
    }
    const arr = Object.entries(reasonsMap).map(([category, count]) => ({
      category,
      value: count,
      share: +((count / (churned.length || 1)) * 100).toFixed(1)
    }));
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 6);
  }, [records]);

  // 7. Heatmap matrix: Contract Type x Tenure Bucket
  const heatmapData = useMemo(() => {
    const contractTypes = ['30-Day Rolling', '12 Months', '18 Months', '24 Months'];
    const tenureBuckets = ['0-6m', '7-12m', '13-24m', '25-48m', '49m+'];

    const matrix: { contract: string; tenure: string; churnRate: number; count: number }[] = [];

    for (const ct of contractTypes) {
      for (const tb of tenureBuckets) {
        const subset = records.filter(r => {
          if (r.contractType !== ct) return false;
          const t = r.tenureMonths || 0;
          let match = false;
          if (tb === '0-6m' && t <= 6) match = true;
          else if (tb === '7-12m' && t > 6 && t <= 12) match = true;
          else if (tb === '13-24m' && t > 12 && t <= 24) match = true;
          else if (tb === '25-48m' && t > 24 && t <= 48) match = true;
          else if (tb === '49m+' && t > 48) match = true;
          return match;
        });

        const churnCount = subset.filter(r => r.churnFlag === 1 || r.churnStatus === 'Churned').length;
        const rate = subset.length > 0 ? +((churnCount / subset.length) * 100).toFixed(1) : 0;
        matrix.push({
          contract: ct,
          tenure: tb,
          churnRate: rate,
          count: subset.length
        });
      }
    }

    return { contractTypes, tenureBuckets, matrix };
  }, [records]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Risk Score Intelligence & Tier Tracking Command Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#7A0C1E] dark:text-[#E5C566]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Customer Risk Score Intelligence & Cohort Tracking
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToSummary && (
              <button
                onClick={onNavigateToSummary}
                className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-[#C9A227] text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#C9A227]" />
                Detailed Executive Summary
              </button>
            )}
            {onNavigateToCalculator && (
              <button
                onClick={onNavigateToCalculator}
                className="px-2.5 py-1 text-xs font-semibold bg-[#0B1F3A] hover:bg-[#12305A] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Calculator className="w-3.5 h-3.5 text-[#E5C566]" />
                Risk Score Calculator
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Critical Risk Tier Card (≥70%) */}
          <div className="bg-gradient-to-br from-white to-red-50/40 dark:from-[#0D1C30] dark:to-[#1a080c] border border-red-200 dark:border-[#4D0612] p-4.5 rounded-xl shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#4D0612] text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Critical Risk (≥70%)
              </span>
              <span className="text-[11px] font-semibold font-mono-tabular text-[#7A0C1E] dark:text-red-400">
                {kpis.criticalSharePercent}% of base
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold font-mono-tabular text-[#4D0612] dark:text-red-300">
                  {kpis.customersInCriticalRisk.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">accounts</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold font-mono-tabular text-slate-700 dark:text-slate-300">
                  Avg {kpis.criticalAvgRiskScore}%
                </span>
                <p className="text-[10px] text-slate-400">mean probability</p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-red-100 dark:border-[#4D0612]/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Monthly Exposed</span>
                <span className="font-bold font-mono-tabular text-[#7A0C1E] dark:text-red-300">
                  £{kpis.criticalRevenueAtRiskGbp.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">12M Annual Loss</span>
                <span className="font-bold font-mono-tabular text-slate-800 dark:text-slate-200">
                  £{(kpis.criticalRevenueAtRiskGbp * 12).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-medium text-[#7A0C1E] dark:text-red-400 bg-red-100/60 dark:bg-red-950/40 px-2 py-1 rounded text-center">
              Priority outreach • Executive save intervention
            </div>
          </div>

          {/* High Risk Tier Card (50-69%) */}
          <div className="bg-gradient-to-br from-white to-orange-50/40 dark:from-[#0D1C30] dark:to-[#1f1008] border border-orange-200 dark:border-[#A3152B]/40 p-4.5 rounded-xl shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#A3152B] text-white">
                High Risk (50–69%)
              </span>
              <span className="text-[11px] font-semibold font-mono-tabular text-[#A3152B] dark:text-orange-400">
                {kpis.highSharePercent}% of base
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold font-mono-tabular text-[#A3152B] dark:text-orange-300">
                  {kpis.customersInHighRisk.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">accounts</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold font-mono-tabular text-slate-700 dark:text-slate-300">
                  Avg {kpis.highAvgRiskScore}%
                </span>
                <p className="text-[10px] text-slate-400">mean probability</p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-orange-100 dark:border-[#A3152B]/40 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Monthly Exposed</span>
                <span className="font-bold font-mono-tabular text-[#A3152B] dark:text-orange-300">
                  £{kpis.highRevenueAtRiskGbp.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">12M Annual Loss</span>
                <span className="font-bold font-mono-tabular text-slate-800 dark:text-slate-200">
                  £{(kpis.highRevenueAtRiskGbp * 12).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-medium text-[#A3152B] dark:text-orange-400 bg-orange-100/60 dark:bg-orange-950/40 px-2 py-1 rounded text-center">
              Contract renewal offers • Goodwill credits
            </div>
          </div>

          {/* Medium Risk Tier Card (30-49%) */}
          <div className="bg-gradient-to-br from-white to-amber-50/40 dark:from-[#0D1C30] dark:to-[#1c1808] border border-amber-200 dark:border-[#C9A227]/40 p-4.5 rounded-xl shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#C9A227] text-[#0B1F3A]">
                Medium Risk (30–49%)
              </span>
              <span className="text-[11px] font-semibold font-mono-tabular text-[#C9A227] dark:text-[#E5C566]">
                {kpis.mediumSharePercent}% of base
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold font-mono-tabular text-[#C9A227] dark:text-[#E5C566]">
                  {kpis.customersInMediumRisk.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">accounts</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold font-mono-tabular text-slate-700 dark:text-slate-300">
                  Avg {kpis.mediumAvgRiskScore}%
                </span>
                <p className="text-[10px] text-slate-400">mean probability</p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-100 dark:border-[#C9A227]/40 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Monthly Exposed</span>
                <span className="font-bold font-mono-tabular text-[#C9A227] dark:text-[#E5C566]">
                  £{kpis.mediumRevenueAtRiskGbp.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">12M Annual Loss</span>
                <span className="font-bold font-mono-tabular text-slate-800 dark:text-slate-200">
                  £{(kpis.mediumRevenueAtRiskGbp * 12).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-medium text-[#8A6D15] dark:text-[#E5C566] bg-amber-100/60 dark:bg-amber-950/40 px-2 py-1 rounded text-center">
              Plan check-up • Data allowance rebalancing
            </div>
          </div>

          {/* Low Risk Tier Card (<30%) */}
          <div className="bg-gradient-to-br from-white to-slate-50/60 dark:from-[#0D1C30] dark:to-[#091524] border border-slate-200 dark:border-[#1E3452] p-4.5 rounded-xl shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0B1F3A] text-white">
                Low Risk (&lt;30%)
              </span>
              <span className="text-[11px] font-semibold font-mono-tabular text-slate-600 dark:text-slate-400">
                {kpis.lowSharePercent}% of base
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold font-mono-tabular text-[#0B1F3A] dark:text-white">
                  {kpis.customersInLowRisk.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">accounts</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold font-mono-tabular text-slate-700 dark:text-slate-300">
                  Avg {kpis.lowAvgRiskScore}%
                </span>
                <p className="text-[10px] text-slate-400">mean probability</p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#1E3452] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Protected Base MRR</span>
                <span className="font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400">
                  £{(kpis.effectiveMonthlyRecurringRevenueGbp - kpis.modelRevenueAtRiskGbp > 0 ? (kpis.effectiveMonthlyRecurringRevenueGbp - kpis.modelRevenueAtRiskGbp) : 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Baseline Risk</span>
                <span className="font-bold font-mono-tabular text-slate-800 dark:text-slate-200">
                  £{kpis.lowRevenueAtRiskGbp.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/40 px-2 py-1 rounded text-center">
              Loyalty rewards • Speed & upgrade cross-sell
            </div>
          </div>
        </div>
      </div>

      {/* 12 Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Customers</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
              {kpis.totalCustomers.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{kpis.activeCustomers.toLocaleString()} active base</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Portfolio Churn</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#7A0C1E] dark:text-[#E5C566]">
              {kpis.churnRatePercent}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{kpis.churnRateDenominator}</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active MRR</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#0B1F3A] dark:text-white">
              £{kpis.monthlyRecurringRevenueGbp.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Eff: £{kpis.effectiveMonthlyRecurringRevenueGbp.toLocaleString()}</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Monthly Risk</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#C9A227]">
              £{kpis.modelRevenueAtRiskGbp.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Model expected monthly</p>
        </div>

        {/* KPI 5 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">12M Expected Loss</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#7A0C1E] dark:text-[#E5C566]">
              £{kpis.expected12MonthLossGbp.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">12M annualized loss</p>
        </div>

        {/* KPI 6 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Critical & High Risk</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#7A0C1E]">
              {(kpis.customersInCriticalRisk + kpis.customersInHighRisk).toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{kpis.customersInCriticalRisk} critical • {kpis.customersInHighRisk} high</p>
        </div>

        {/* KPI 7 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Average Risk Score</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
              {kpis.portfolioAvgRiskScore}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Base churn probability</p>
        </div>

        {/* KPI 8 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Average Tenure</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
              {kpis.averageTenureMonths}m
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Relationship length</p>
        </div>

        {/* KPI 9 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Average CSAT</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
              {kpis.averageSatisfactionScore}
            </span>
            <span className="text-xs text-slate-400">/ 10</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Customer satisfaction</p>
        </div>

        {/* KPI 10 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Net NPS</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#1D4C8F] dark:text-[#E5C566]">
              {kpis.netNpsScore > 0 ? `+${kpis.netNpsScore}` : kpis.netNpsScore}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{kpis.npsMethod}</p>
        </div>

        {/* KPI 11 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Expires in 30 Days</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#7A0C1E]">
              {kpis.contractsExpiring30dCount}
            </span>
            <span className="text-xs text-slate-400">accts</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Imminent contract cliff</p>
        </div>

        {/* KPI 12 */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Expires in 60 Days</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#C9A227]">
              {kpis.contractsExpiring60dCount}
            </span>
            <span className="text-xs text-slate-400">accts</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Renewal decision window</p>
        </div>
      </div>

      {/* AI Executive Summary Card */}
      <div className="bg-white dark:bg-[#0D1C30] border border-[#1E3452]/40 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1E3452]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C9A227]/20 flex items-center justify-center text-[#C9A227]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                AI Executive Intelligence Briefing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grounded 6-point narrative computed directly from live telemetry facts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-[#12305A] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onRegenerateAiSummary}
              disabled={isAiLoading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#E5C566] ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {aiSummary.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="text-[#C9A227] font-bold text-base leading-none">•</span>
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of Core Visual Charts (Conforming to §9.3 zero-gridlines rules) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Churn Rate by Segment */}
        <ChartCard
          title="Churn Rate by Customer Segment"
          subtitle="Observed churn rate % across Consumer and Small Business segments"
          tableData={segmentData.map(d => ({ label: d.category, value: `${d.value}%`, secondary: `${d.count} accounts` }))}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={segmentData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="category" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis unit="%" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip formatter={(val) => [`${val}%`, 'Churn Rate']} />
              <Bar dataKey="value" fill="#0B1F3A" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={(v) => `${v}%`} fill="#1e293b" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Churn Rate by Service Type */}
        <ChartCard
          title="Churn Rate by Telecommunications Service"
          subtitle="Attrition propensity across Fibre Broadband, 5G Mobile, and Business packages"
          tableData={serviceData.map(d => ({ label: d.category, value: `${d.value}%`, secondary: `${d.count} accounts` }))}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={serviceData} layout="vertical" margin={{ top: 10, right: 40, left: 30, bottom: 10 }}>
              <XAxis type="number" unit="%" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis dataKey="category" type="category" width={120} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip formatter={(val) => [`${val}%`, 'Churn Rate']} />
              <Bar dataKey="value" fill="#1D4C8F" radius={[0, 6, 6, 0]}>
                <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} fill="#1e293b" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3: Churn Rate by Contract Type */}
        <ChartCard
          title="Churn Rate by Contract Commitment"
          subtitle="Fixed term commitment vs 30-Day Rolling arrangements"
          tableData={contractData.map(d => ({ label: d.category, value: `${d.value}%`, secondary: `${d.count} accounts` }))}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={contractData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="category" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis unit="%" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip formatter={(val) => [`${val}%`, 'Churn Rate']} />
              <Bar dataKey="value" fill="#7A0C1E" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={(v) => `${v}%`} fill="#1e293b" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: Risk Tier Distribution Donut */}
        <ChartCard
          title="Active Base Risk Tier Distribution"
          subtitle="Accounts classified into Critical, High, Medium, and Low risk bands"
          tableData={tierData.map(d => ({ label: d.name, value: d.value, secondary: `${d.share}%` }))}
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={tierData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                label={({ name, percent }: any) => `${(name || '').split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {tierData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} accounts`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Full-width Heatmap Matrix: Contract Type x Tenure Bucket */}
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Contract Type × Tenure Bucket Churn Rate Matrix (%)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Filled cell heatmap without distracting gridlines, showing intersectional churn vulnerability
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1E3452]">
                <th className="py-3 px-4 text-left font-semibold text-slate-500">Contract Arrangement</th>
                {heatmapData.tenureBuckets.map(tb => (
                  <th key={tb} className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    {tb}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3452]/40">
              {heatmapData.contractTypes.map(ct => (
                <tr key={ct}>
                  <td className="py-3 px-4 text-left font-bold text-slate-800 dark:text-slate-200">
                    {ct}
                  </td>
                  {heatmapData.tenureBuckets.map(tb => {
                    const cell = heatmapData.matrix.find(m => m.contract === ct && m.tenure === tb);
                    const rate = cell ? cell.churnRate : 0;
                    const count = cell ? cell.count : 0;

                    // Color intensity
                    let bg = 'rgba(11, 31, 58, 0.04)';
                    let textCol = '#1e293b';
                    if (rate >= 40) {
                      bg = 'rgba(122, 12, 30, 0.35)';
                      textCol = '#4D0612';
                    } else if (rate >= 25) {
                      bg = 'rgba(163, 21, 43, 0.20)';
                      textCol = '#7A0C1E';
                    } else if (rate >= 15) {
                      bg = 'rgba(201, 162, 39, 0.20)';
                      textCol = '#8F7218';
                    }

                    return (
                      <td key={tb} className="py-2.5 px-3">
                        <div
                          className="py-2 px-3 rounded-lg font-mono-tabular font-bold transition-all"
                          style={{ backgroundColor: bg, color: textCol }}
                          title={`${ct} · ${tb}: ${rate}% (${count} accounts)`}
                        >
                          <div>{rate}%</div>
                          <div className="text-[10px] font-normal opacity-70">{count} accts</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
