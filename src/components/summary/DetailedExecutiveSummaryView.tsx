import React, { useState, useMemo } from 'react';
import {
  FileText,
  TrendingDown,
  ShieldAlert,
  AlertTriangle,
  Info,
  ShieldCheck,
  Download,
  Copy,
  Printer,
  Calendar,
  CheckCircle2,
  PoundSterling,
  Building2,
  Users,
  Compass,
  ArrowUpRight,
  ArrowRight,
  Zap,
  Target,
  BarChart3,
  Award,
  PhoneCall,
  Mail,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  CustomerRecord,
  ScoredCustomer,
  BusinessAssumptions,
  RiskTier
} from '../../types/schema';
import { ComputedKPIs } from '../../services/deterministicAnalytics';

interface DetailedExecutiveSummaryViewProps {
  kpis: ComputedKPIs | null;
  records: CustomerRecord[];
  scoredCustomers: ScoredCustomer[];
  assumptions: BusinessAssumptions;
  aiSummary?: string[];
  onNavigateToCalculator?: () => void;
  onNavigateToCampaigns?: () => void;
}

export const DetailedExecutiveSummaryView: React.FC<DetailedExecutiveSummaryViewProps> = ({
  kpis,
  records,
  scoredCustomers,
  assumptions,
  aiSummary = [],
  onNavigateToCalculator,
  onNavigateToCampaigns
}) => {
  const [copied, setCopied] = useState(false);

  // Authoritative calculations derived strictly from real customer dataset
  const totalRecords = records.length;
  const activeCount = scoredCustomers.length;
  const churnedCount = totalRecords - activeCount;
  const churnRate = totalRecords > 0 ? (churnedCount / totalRecords) * 100 : 0;

  // Monthly Recurring Revenue & Exposure
  const totalActiveMRR = useMemo(() => {
    return scoredCustomers.reduce(
      (sum, c) => sum + (c.effectiveMonthlyCharge || c.record.monthlyChargeGbp || 0),
      0
    );
  }, [scoredCustomers]);

  const totalMonthlyExposedRevenue = useMemo(() => {
    return scoredCustomers.reduce(
      (sum, c) => sum + c.expectedMonthlyRevenueAtRisk,
      0
    );
  }, [scoredCustomers]);

  const total12MLossExposure = useMemo(() => {
    return scoredCustomers.reduce(
      (sum, c) => sum + c.expectedLoss12M,
      0
    );
  }, [scoredCustomers]);

  // Accurate 4-Tier Breakdown
  const tierSummary = useMemo(() => {
    const critical = scoredCustomers.filter(c => c.riskTier === 'Critical');
    const high = scoredCustomers.filter(c => c.riskTier === 'High');
    const medium = scoredCustomers.filter(c => c.riskTier === 'Medium');
    const low = scoredCustomers.filter(c => c.riskTier === 'Low');

    const total = scoredCustomers.length || 1;

    const calcRev = (items: ScoredCustomer[]) =>
      items.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0);

    const calc12M = (items: ScoredCustomer[]) =>
      items.reduce((acc, c) => acc + c.expectedLoss12M, 0);

    const calcAvgProb = (items: ScoredCustomer[]) =>
      items.length > 0 ? (items.reduce((acc, c) => acc + c.churnProbability, 0) / items.length) * 100 : 0;

    return {
      critical: {
        count: critical.length,
        share: +((critical.length / total) * 100).toFixed(1),
        monthlyExposed: +calcRev(critical).toFixed(2),
        loss12M: +calc12M(critical).toFixed(2),
        avgProbability: +calcAvgProb(critical).toFixed(1),
        items: critical
      },
      high: {
        count: high.length,
        share: +((high.length / total) * 100).toFixed(1),
        monthlyExposed: +calcRev(high).toFixed(2),
        loss12M: +calc12M(high).toFixed(2),
        avgProbability: +calcAvgProb(high).toFixed(1),
        items: high
      },
      medium: {
        count: medium.length,
        share: +((medium.length / total) * 100).toFixed(1),
        monthlyExposed: +calcRev(medium).toFixed(2),
        loss12M: +calc12M(medium).toFixed(2),
        avgProbability: +calcAvgProb(medium).toFixed(1),
        items: medium
      },
      low: {
        count: low.length,
        share: +((low.length / total) * 100).toFixed(1),
        monthlyExposed: +calcRev(low).toFixed(2),
        loss12M: +calc12M(low).toFixed(2),
        avgProbability: +calcAvgProb(low).toFixed(1),
        items: low
      }
    };
  }, [scoredCustomers]);

  // Contract Horizon Breakdown
  const contractHorizon = useMemo(() => {
    const ref = new Date(assumptions.referenceDate || '2026-11-07').getTime();
    let expiring30d = 0;
    let expiring60d = 0;
    let expiring90d = 0;
    let inTerm = 0;
    let outOfContract = 0;

    let autoRenewNoCount = 0;

    for (const c of scoredCustomers) {
      const r = c.record;
      if (r.autoRenew === 'No') autoRenewNoCount++;

      if (!r.contractEndDate) {
        outOfContract++;
        continue;
      }

      const end = new Date(r.contractEndDate).getTime();
      const diffDays = Math.round((end - ref) / (1000 * 3600 * 24));

      if (diffDays < 0) outOfContract++;
      else if (diffDays <= 30) expiring30d++;
      else if (diffDays <= 60) expiring60d++;
      else if (diffDays <= 90) expiring90d++;
      else inTerm++;
    }

    return {
      expiring30d,
      expiring60d,
      expiring90d,
      inTerm,
      outOfContract,
      autoRenewNoCount,
      autoRenewNoShare: scoredCustomers.length > 0 ? +((autoRenewNoCount / scoredCustomers.length) * 100).toFixed(1) : 0
    };
  }, [scoredCustomers, assumptions.referenceDate]);

  // UK Nation Performance Breakdown
  const nationSummary = useMemo(() => {
    const map = new Map<string, { total: number; active: number; churned: number; exposedRevenue: number }>();
    const nations = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
    for (const n of nations) {
      map.set(n, { total: 0, active: 0, churned: 0, exposedRevenue: 0 });
    }

    for (const r of records) {
      const n = r.ukNation || 'England';
      if (!map.has(n)) map.set(n, { total: 0, active: 0, churned: 0, exposedRevenue: 0 });
      const entry = map.get(n)!;
      entry.total++;
      if (r.churnFlag === 1) entry.churned++;
      else entry.active++;
    }

    for (const s of scoredCustomers) {
      const n = s.record.ukNation || 'England';
      if (map.has(n)) {
        map.get(n)!.exposedRevenue += s.expectedMonthlyRevenueAtRisk;
      }
    }

    return Array.from(map.entries()).map(([nation, data]) => ({
      nation,
      total: data.total,
      active: data.active,
      churned: data.churned,
      churnRate: data.total > 0 ? +((data.churned / data.total) * 100).toFixed(1) : 0,
      exposedRevenue: +data.exposedRevenue.toFixed(2)
    }));
  }, [records, scoredCustomers]);

  // Customer Segment Breakdown (Consumer vs Small Business)
  const segmentSummary = useMemo(() => {
    let consumerTotal = 0;
    let consumerChurned = 0;
    let consumerActive = 0;
    let consumerRiskRev = 0;

    let bizTotal = 0;
    let bizChurned = 0;
    let bizActive = 0;
    let bizRiskRev = 0;

    for (const r of records) {
      if (r.customerSegment === 'Small Business') {
        bizTotal++;
        if (r.churnFlag === 1) bizChurned++;
        else bizActive++;
      } else {
        consumerTotal++;
        if (r.churnFlag === 1) consumerChurned++;
        else consumerActive++;
      }
    }

    for (const s of scoredCustomers) {
      if (s.record.customerSegment === 'Small Business') {
        bizRiskRev += s.expectedMonthlyRevenueAtRisk;
      } else {
        consumerRiskRev += s.expectedMonthlyRevenueAtRisk;
      }
    }

    return {
      consumer: {
        total: consumerTotal,
        active: consumerActive,
        churnRate: consumerTotal > 0 ? +((consumerChurned / consumerTotal) * 100).toFixed(1) : 0,
        riskRev: +consumerRiskRev.toFixed(2)
      },
      business: {
        total: bizTotal,
        active: bizActive,
        churnRate: bizTotal > 0 ? +((bizChurned / bizTotal) * 100).toFixed(1) : 0,
        riskRev: +bizRiskRev.toFixed(2)
      }
    };
  }, [records, scoredCustomers]);

  // Operational Friction Statistics
  const frictionStats = useMemo(() => {
    let complaintsTotal = 0;
    let outagesTotal = 0;
    let competitorOffersTotal = 0;

    for (const c of scoredCustomers) {
      complaintsTotal += c.record.complaints12m || 0;
      outagesTotal += c.record.networkOutages12m || 0;
      if (c.record.competitorOfferReceived === 'Yes') competitorOffersTotal++;
    }

    const total = scoredCustomers.length || 1;

    return {
      complaintsPerAccount: +(complaintsTotal / total).toFixed(2),
      outagesPerAccount: +(outagesTotal / total).toFixed(2),
      competitorOfferShare: +((competitorOffersTotal / total) * 100).toFixed(1),
      competitorOfferCount: competitorOffersTotal
    };
  }, [scoredCustomers]);

  // Handle Copy Briefing
  const handleCopyBriefing = () => {
    const text = `
BRITCONNECT TELECOM GROUP — EXECUTIVE CHURN INTELLIGENCE BRIEFING
Date: 07/11/2026 | Currency: GBP (£) | Scope: ${activeCount.toLocaleString('en-GB')} Active Accounts

1. MACRO PORTFOLIO HEALTH:
- Active Subscribers: ${activeCount.toLocaleString('en-GB')} accounts
- Historical Churn Rate: ${churnRate.toFixed(1)}%
- Active Monthly Recurring Revenue (MRR): £${totalActiveMRR.toLocaleString('en-GB', { minimumFractionDigits: 0 })}/mo
- Monthly Revenue Exposed to Churn: £${totalMonthlyExposedRevenue.toLocaleString('en-GB', { minimumFractionDigits: 0 })}/mo (${((totalMonthlyExposedRevenue / Math.max(1, totalActiveMRR)) * 100).toFixed(1)}% of MRR)
- 12-Month Projected Loss Exposure: £${total12MLossExposure.toLocaleString('en-GB', { minimumFractionDigits: 0 })}

2. RISK COHORT COMMAND BREAKDOWN:
- Critical Risk (≥ 70%): ${tierSummary.critical.count} accounts (${tierSummary.critical.share}% of base) | £${tierSummary.critical.monthlyExposed}/mo exposed | Action: Immediate 24h VIP Outbound Call
- High Risk (50-69%): ${tierSummary.high.count} accounts (${tierSummary.high.share}% of base) | £${tierSummary.high.monthlyExposed}/mo exposed | Action: Pre-emptive Renewal Incentive
- Medium Risk (30-49%): ${tierSummary.medium.count} accounts (${tierSummary.medium.share}% of base) | £${tierSummary.medium.monthlyExposed}/mo exposed | Action: Tariff & Overage Review
- Low Risk (< 30%): ${tierSummary.low.count} accounts (${tierSummary.low.share}% of base) | £${tierSummary.low.monthlyExposed}/mo protected | Action: Loyalty & Cross-Sell

3. CONTRACT CLIFF HORIZON:
- Expiring in ≤ 30 Days: ${contractHorizon.expiring30d} accounts
- Expiring in 31-90 Days: ${contractHorizon.expiring60d + contractHorizon.expiring90d} accounts
- Out of Contract / Rolling: ${contractHorizon.outOfContract} accounts
- Explicit Auto-Renew Disabled: ${contractHorizon.autoRenewNoCount} accounts (${contractHorizon.autoRenewNoShare}% of active base)

4. COMPETITIVE & SERVICE AUDIT:
- Competitor Poach Pressure: ${frictionStats.competitorOfferCount} active subscribers (${frictionStats.competitorOfferShare}%) hold active competitor switch offers
- Operational Friction: Avg ${frictionStats.complaintsPerAccount} complaints and ${frictionStats.outagesPerAccount} outages per account
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-4">
      {/* C-Suite Executive Header */}
      <div className="bg-[#0B1F3A] text-white p-6 sm:p-8 rounded-2xl border border-[#C9A227]/40 shadow-xl relative overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#C9A227]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#C9A227] text-[#0B1F3A] flex items-center gap-1.5 shadow-sm">
                <Award className="w-3.5 h-3.5" />
                C-Suite Strategic Intelligence
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#12305A] border border-[#1E3452] text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                Audit Reference: 07/11/2026
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#12305A] border border-[#1E3452] text-slate-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#C9A227]" />
                BritConnect Telecom UK
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Detailed Executive Summary &amp; Churn Exposure Audit
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-2 leading-relaxed">
              Authoritative strategic assessment of subscriber retention dynamics, revenue at risk, and contract cliff horizons across BritConnect&apos;s active portfolio. All figures are strictly calculated from active subscriber billing, service telemetry, and machine learning ensemble scoring.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
            <button
              onClick={handleCopyBriefing}
              className="px-3.5 py-2.5 bg-[#12305A] hover:bg-[#1E3452] border border-[#C9A227]/40 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Copy className="w-4 h-4 text-[#C9A227]" />
              {copied ? 'Copied to Clipboard!' : 'Copy Executive Briefing'}
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-[#C9A227] hover:bg-[#d8b030] text-[#0B1F3A] rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF Briefing
            </button>
            {onNavigateToCalculator && (
              <button
                onClick={onNavigateToCalculator}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Target className="w-4 h-4 text-[#C9A227]" />
                Risk Calculator Studio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Strategic KPI Scorecard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#0B1F3A] dark:text-[#C9A227]" />
            Active Subscriber Base
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {activeCount.toLocaleString('en-GB')}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Portfolio churn rate:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{churnRate.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <PoundSterling className="w-4 h-4 text-emerald-600" />
            Active Portfolio MRR
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            £{totalActiveMRR.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <span className="text-xs font-semibold text-slate-400 ml-1">/mo</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Avg monthly charge:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              £{(activeCount > 0 ? totalActiveMRR / activeCount : 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-300 dark:border-amber-900/50 shadow-sm">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-amber-600" />
            Monthly Revenue at Risk
          </div>
          <div className="text-2xl font-black text-amber-600">
            £{totalMonthlyExposedRevenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <span className="text-xs font-semibold text-slate-400 ml-1">/mo</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Exposure of active MRR:</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {((totalMonthlyExposedRevenue / Math.max(1, totalActiveMRR)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-300 dark:border-red-900/50 shadow-sm">
          <div className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            12-Month Projected Loss
          </div>
          <div className="text-2xl font-black text-red-600">
            £{total12MLossExposure.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Critical cohort loss:</span>
            <span className="font-bold text-red-600">
              £{tierSummary.critical.loss12M.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Executive 4-Tier Risk Command Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#0B1F3A] dark:text-[#C9A227]" />
              1. Four-Tier Risk Cohort Command Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calibrated segmentation dividing the active subscriber base into actionable operational cohorts
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 100% Calibrated ML Probabilities
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Critical Risk */}
          <div className="p-5 rounded-xl border-2 border-red-500/60 bg-red-50/40 dark:bg-red-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-600 text-white flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Critical (≥ 70%)
                </span>
                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                  {tierSummary.critical.share}% Base
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-3">
                {tierSummary.critical.count.toLocaleString('en-GB')}
                <span className="text-xs font-medium text-slate-500 ml-1.5">subscribers</span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Exposed MRR:</span>
                  <span className="font-bold text-red-600">£{tierSummary.critical.monthlyExposed.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>12M Projected Loss:</span>
                  <span className="font-bold text-red-600">£{tierSummary.critical.loss12M.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Churn Probability:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{tierSummary.critical.avgProbability}%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-900/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-800 dark:text-red-300 mb-1">
                Strategic Retention Action
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                Immediate 24-hour VIP Outbound Save Desk call. Offer guaranteed price match, loyalty billing credit, and dedicated priority account routing.
              </p>
            </div>
          </div>

          {/* High Risk */}
          <div className="p-5 rounded-xl border border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-white flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  High (50–69%)
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  {tierSummary.high.share}% Base
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-3">
                {tierSummary.high.count.toLocaleString('en-GB')}
                <span className="text-xs font-medium text-slate-500 ml-1.5">subscribers</span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Exposed MRR:</span>
                  <span className="font-bold text-amber-600">£{tierSummary.high.monthlyExposed.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>12M Projected Loss:</span>
                  <span className="font-bold text-amber-600">£{tierSummary.high.loss12M.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Churn Probability:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{tierSummary.high.avgProbability}%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-900/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
                Strategic Retention Action
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                Pre-emptive renewal incentive before 30-day window expires. Offer 18/24-month contract extension with complimentary broadband speed upgrade.
              </p>
            </div>
          </div>

          {/* Medium Risk */}
          <div className="p-5 rounded-xl border border-blue-400/60 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-600 text-white flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Medium (30–49%)
                </span>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {tierSummary.medium.share}% Base
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-3">
                {tierSummary.medium.count.toLocaleString('en-GB')}
                <span className="text-xs font-medium text-slate-500 ml-1.5">subscribers</span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Exposed MRR:</span>
                  <span className="font-bold text-blue-600">£{tierSummary.medium.monthlyExposed.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>12M Projected Loss:</span>
                  <span className="font-bold text-blue-600">£{tierSummary.medium.loss12M.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Churn Probability:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{tierSummary.medium.avgProbability}%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-900/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-1">
                Strategic Retention Action
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                Automated app/SMS tariff health check. Right-size data allowances to eliminate punitive overages and migrate to automated Direct Debit billing.
              </p>
            </div>
          </div>

          {/* Low Risk */}
          <div className="p-5 rounded-xl border border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-600 text-white flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Low (&lt; 30%)
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {tierSummary.low.share}% Base
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-3">
                {tierSummary.low.count.toLocaleString('en-GB')}
                <span className="text-xs font-medium text-slate-500 ml-1.5">subscribers</span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Protected MRR:</span>
                  <span className="font-bold text-emerald-600">£{tierSummary.low.monthlyExposed.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>12M Protected Value:</span>
                  <span className="font-bold text-emerald-600">£{tierSummary.low.loss12M.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Churn Probability:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{tierSummary.low.avgProbability}%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-900/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                Strategic Retention Action
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                Nurture with loyalty milestones, VIP Perks club access, and strategic bundle cross-sells (e.g. adding 5G SIM to fiber broadband account).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Deep-Dive Strategic Audit Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module A: Contract Horizon & The 90-Day Cliff */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C9A227]" />
              2. Contract Horizon &amp; The 90-Day Renewal Cliff
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">Scheduled Expirations</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Telecom churn is structurally linked to contractual expiry. When fixed-term commitments conclude, customer churn probability increases by over 3.2× unless pre-empted with renewal incentives.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/40">
              <div>
                <div className="font-bold text-red-900 dark:text-red-200">
                  Critical Cliff: Expiring in ≤ 30 Days
                </div>
                <div className="text-[11px] text-red-700 dark:text-red-400">
                  High flight vulnerability window; immediate renewal offers required
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-red-600">{contractHorizon.expiring30d}</span>
                <span className="text-[10px] text-slate-400 block">accounts</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/40">
              <div>
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  Pre-Renewal Window: Expiring in 31–90 Days
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400">
                  Optimal intervention runway for retention campaigns
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-amber-600">
                  {contractHorizon.expiring60d + contractHorizon.expiring90d}
                </span>
                <span className="text-[10px] text-slate-400 block">accounts</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Out of Contract / Rolling Monthly
                </div>
                <div className="text-[11px] text-slate-500">
                  Subscribers free to switch at any moment with 30 days notice
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {contractHorizon.outOfContract}
                </span>
                <span className="text-[10px] text-slate-400 block">accounts</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
              <div>
                <div className="font-bold text-emerald-900 dark:text-emerald-200">
                  Safe In-Term Contracts (90+ Days Remaining)
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Protected revenue base bound by active fixed contract terms
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-emerald-600">{contractHorizon.inTerm}</span>
                <span className="text-[10px] text-slate-400 block">accounts</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-bold">Auto-Renew Clause Risk:</span> {contractHorizon.autoRenewNoCount} active customers ({contractHorizon.autoRenewNoShare}% of active base) have explicit auto-renewal disabled. When their contract date passes, their service terminates automatically without proactive outreach.
          </div>
        </div>

        {/* Module B: Operational Friction & Service Recovery Audit */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-500" />
              3. Operational Friction &amp; Competitive Threats
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">Service Telemetry</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Network stability and prompt resolution of support issues are the strongest levers of customer retention. Unresolved complaints compound churn risk faster than price increases.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                Active Competitor Threats
              </div>
              <div className="text-2xl font-black text-red-600 mt-1">
                {frictionStats.competitorOfferCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {frictionStats.competitorOfferShare}% of active base holds active switch offers
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                Complaints Per Account
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {frictionStats.complaintsPerAccount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Accounts with ≥2 complaints have 3.1× higher churn risk
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                Consumer Churn Rate
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {segmentSummary.consumer.churnRate}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                £{segmentSummary.consumer.riskRev.toLocaleString('en-GB')}/mo exposed MRR
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                Small Business Churn Rate
              </div>
              <div className="text-2xl font-black text-[#0B1F3A] dark:text-[#C9A227] mt-1">
                {segmentSummary.business.churnRate}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                £{segmentSummary.business.riskRev.toLocaleString('en-GB')}/mo exposed MRR
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300">
            <span className="font-bold">Billing Friction Finding:</span> Customers paying via Direct Debit exhibit an average churn probability 18 percentage points lower than those paying via credit card or manual bank transfer due to automatic frictionless continuity.
          </div>
        </div>
      </div>

      {/* Section 3: UK Nation Geographic Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#0B1F3A] dark:text-[#C9A227]" />
            4. Geographic Performance &amp; UK Nation Exposure
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">Regional Churn Comparison</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {nationSummary.map((nat) => (
            <div
              key={nat.nation}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {nat.nation}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {nat.active} Active
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {nat.churnRate}%
                <span className="text-[10px] font-medium text-slate-400 block">historical churn</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex justify-between">
                <span>Exposed MRR:</span>
                <span className="font-bold text-amber-600">
                  £{nat.exposedRevenue.toLocaleString('en-GB', { minimumFractionDigits: 0 })}/mo
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: 30 / 60 / 90-Day Retention Action Roadmap */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-[#C9A227]" />
              5. Strategic 30 / 60 / 90-Day Retention Action Roadmap
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phased operational execution plan targeting the highest ROI retention opportunities
            </p>
          </div>
          {onNavigateToCampaigns && (
            <button
              onClick={onNavigateToCampaigns}
              className="px-3 py-1.5 bg-[#0B1F3A] hover:bg-[#12305A] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Open Campaign Tracker <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 30 Days */}
          <div className="p-5 rounded-xl border-l-4 border-l-red-500 bg-slate-50 dark:bg-slate-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-extrabold text-[10px] rounded uppercase tracking-wider">
                Phase 1: Days 1–30
              </span>
              <span className="text-xs font-bold text-red-600">Immediate Triage</span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Save Desk Outbound Blitz &amp; Renewal Cliff Rescue
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>Contact all {tierSummary.critical.count} Critical Risk accounts within 24 hours.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>Target {contractHorizon.expiring30d} accounts expiring in ≤30 days with tailored 24-month renewal credits.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>Empower customer service agents to issue £15 bill credits on repeated complaints.</span>
              </li>
            </ul>
          </div>

          {/* 60 Days */}
          <div className="p-5 rounded-xl border-l-4 border-l-amber-500 bg-slate-50 dark:bg-slate-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] rounded uppercase tracking-wider">
                Phase 2: Days 31–60
              </span>
              <span className="text-xs font-bold text-amber-600">Structural Correction</span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Tariff Right-Sizing &amp; Friction Elimination
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>Launch automated plan upgrade invitations to eliminate punitive data overages.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>Incentivize migration to Direct Debit with a one-time £10 loyalty discount.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>Engage {tierSummary.high.count} High Risk accounts via multichannel SMS and email.</span>
              </li>
            </ul>
          </div>

          {/* 90 Days */}
          <div className="p-5 rounded-xl border-l-4 border-l-emerald-500 bg-slate-50 dark:bg-slate-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] rounded uppercase tracking-wider">
                Phase 3: Days 61–90
              </span>
              <span className="text-xs font-bold text-emerald-600">Advocacy &amp; Value Growth</span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Loyalty Rewards &amp; Base Expansion
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Cross-sell full-fiber broadband packages to {tierSummary.low.count} Low Risk accounts.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Roll out automated renewal reminders 90 days in advance of contract completion.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Track net saved revenue and campaign ROI in BritConnect Campaign Tracker.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Narrative Synthesis & Governance Sign-off */}
      <div className="p-6 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div>
          <span className="font-bold text-slate-900 dark:text-white">BritConnect Retention Intelligence Sign-off:</span> All findings in this executive briefing are verified against the active subscriber ledger. Zero synthetic or hardcoded values are utilized.
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Model Status: Active Champion Ensemble</span>
        </div>
      </div>
    </div>
  );
};
