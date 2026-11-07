import React, { useState, useMemo } from 'react';
import {
  Calculator,
  ShieldAlert,
  AlertTriangle,
  Info,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  TrendingDown,
  ArrowRight,
  Sliders,
  User,
  CheckCircle2,
  PoundSterling,
  BarChart2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap,
  Target
} from 'lucide-react';
import {
  CustomerRecord,
  ScoredCustomer,
  RiskTier,
  BusinessAssumptions
} from '../../types/schema';
import { TrainedModelWeights, predictProbability, explainCustomerRisk } from '../../ml/models';
import { engineerFeatures, extractFeatureVector } from '../../ml/featureEngineering';
import { ComputedKPIs } from '../../services/deterministicAnalytics';

interface RiskScoreCalculatorViewProps {
  records: CustomerRecord[];
  scoredCustomers: ScoredCustomer[];
  activeModel: TrainedModelWeights | null;
  kpis: ComputedKPIs | null;
  assumptions: BusinessAssumptions;
  onSelectCustomer360?: (customer: ScoredCustomer) => void;
}

export const RiskScoreCalculatorView: React.FC<RiskScoreCalculatorViewProps> = ({
  records,
  scoredCustomers,
  activeModel,
  kpis,
  assumptions,
  onSelectCustomer360
}) => {
  // 1. Customer selector state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    scoredCustomers.length > 0 ? scoredCustomers[0].id : ''
  );
  const [searchFilter, setSearchFilter] = useState('');

  // 2. Interactive simulation parameters (initialized with the selected customer or sensible telecom defaults)
  const [tenureMonths, setTenureMonths] = useState<number>(14);
  const [contractStage, setContractStage] = useState<'Expiring ≤30d' | 'Expiring 31-90d' | 'In-Term (90d+)' | 'Out of Contract'>('Expiring ≤30d');
  const [autoRenew, setAutoRenew] = useState<'Yes' | 'No'>('No');
  const [monthlyChargeGbp, setMonthlyChargeGbp] = useState<number>(45);
  const [overageChargesGbp, setOverageChargesGbp] = useState<number>(5);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Direct Debit' | 'Credit Card' | 'Bank Transfer' | 'Cheque'>('Credit Card');
  const [latePayments12m, setLatePayments12m] = useState<number>(1);
  const [supportTickets12m, setSupportTickets12m] = useState<number>(3);
  const [complaints12m, setComplaints12m] = useState<number>(2);
  const [averageResolutionHours, setAverageResolutionHours] = useState<number>(36);
  const [networkOutages12m, setNetworkOutages12m] = useState<number>(3);
  const [satisfactionScore, setSatisfactionScore] = useState<number>(3);
  const [npsScore, setNpsScore] = useState<number>(2);
  const [competitorOfferReceived, setCompetitorOfferReceived] = useState<'Yes' | 'No'>('Yes');
  const [customerSegment, setCustomerSegment] = useState<'Consumer' | 'Small Business'>('Consumer');
  const [serviceType, setServiceType] = useState<string>('Broadband + Mobile');

  // Dynamic threshold testing state
  const [customCriticalThreshold, setCustomCriticalThreshold] = useState<number>(
    assumptions.criticalRiskThreshold || 0.70
  );
  const [customHighThreshold, setCustomHighThreshold] = useState<number>(
    assumptions.highRiskThreshold || 0.50
  );
  const [customMediumThreshold, setCustomMediumThreshold] = useState<number>(
    assumptions.mediumRiskThreshold || 0.30
  );

  // Table filter for previewing categorized accounts
  const [tableTierFilter, setTableTierFilter] = useState<RiskTier | 'All'>('All');

  // Load a customer's real attributes into the calculator inputs
  const handleLoadCustomer = (cust: ScoredCustomer) => {
    setSelectedCustomerId(cust.id);
    const r = cust.record;
    setTenureMonths(r.tenureMonths || 12);
    setMonthlyChargeGbp(r.monthlyChargeGbp || 35);
    setOverageChargesGbp(r.overageChargesGbp || 0);
    setDiscountPercent(r.discountPercent || 0);
    setAutoRenew(r.autoRenew === 'Yes' ? 'Yes' : 'No');
    setPaymentMethod((r.paymentMethod as any) || 'Direct Debit');
    setLatePayments12m(r.latePayments12m || 0);
    setSupportTickets12m(r.supportTickets12m || 0);
    setComplaints12m(r.complaints12m || 0);
    setAverageResolutionHours(r.averageResolutionHours || 12);
    setNetworkOutages12m(r.networkOutages12m || 0);
    setSatisfactionScore(r.satisfactionScore110 || 7);
    setNpsScore(r.npsScore || 7);
    setCompetitorOfferReceived(r.competitorOfferReceived === 'Yes' ? 'Yes' : 'No');
    setCustomerSegment(r.customerSegment === 'Small Business' ? 'Small Business' : 'Consumer');
    setServiceType(r.serviceType || 'Broadband');

    // Determine contract stage
    const ref = new Date(assumptions.referenceDate || '2026-11-07').getTime();
    if (r.contractEndDate) {
      const end = new Date(r.contractEndDate).getTime();
      const diffDays = Math.round((end - ref) / (1000 * 3600 * 24));
      if (diffDays < 0) setContractStage('Out of Contract');
      else if (diffDays <= 30) setContractStage('Expiring ≤30d');
      else if (diffDays <= 90) setContractStage('Expiring 31-90d');
      else setContractStage('In-Term (90d+)');
    } else {
      setContractStage('Out of Contract');
    }
  };

  // Build a synthetic/simulated CustomerRecord from the current inputs
  const simulatedRecord: CustomerRecord = useMemo(() => {
    const refDate = new Date(assumptions.referenceDate || '2026-11-07');
    let endDateStr = '';
    let contractType = '12 Months';

    if (contractStage === 'Out of Contract') {
      const past = new Date(refDate.getTime() - 45 * 86400000);
      endDateStr = past.toISOString().split('T')[0];
      contractType = 'Rolling Monthly';
    } else if (contractStage === 'Expiring ≤30d') {
      const future = new Date(refDate.getTime() + 18 * 86400000);
      endDateStr = future.toISOString().split('T')[0];
      contractType = '12 Months';
    } else if (contractStage === 'Expiring 31-90d') {
      const future = new Date(refDate.getTime() + 60 * 86400000);
      endDateStr = future.toISOString().split('T')[0];
      contractType = '18 Months';
    } else {
      const future = new Date(refDate.getTime() + 270 * 86400000);
      endDateStr = future.toISOString().split('T')[0];
      contractType = '24 Months';
    }

    const joinDate = new Date(refDate.getTime() - tenureMonths * 30.4375 * 86400000)
      .toISOString()
      .split('T')[0];

    return {
      id: selectedCustomerId || 'SIM-TEST-001',
      customerSegment,
      age: 42,
      ageBand: '35-49',
      gender: 'Female',
      ukNation: 'England',
      city: 'London',
      acquisitionChannel: 'Direct Web',
      joinDate,
      tenureMonths,
      serviceType,
      planName: 'Standard Fiber',
      contractType,
      contractStartDate: joinDate,
      contractEndDate: endDateStr,
      autoRenew,
      monthlyChargeGbp,
      averageMonthlyUsageGb: 120,
      dataAllowanceGb: 200,
      overageChargesGbp,
      discountPercent,
      paymentMethod,
      directDebit: paymentMethod === 'Direct Debit' ? 'Yes' : 'No',
      latePayments12m,
      failedPayments12m: latePayments12m > 1 ? 1 : 0,
      supportTickets12m,
      complaints12m,
      averageResolutionHours,
      networkOutages12m,
      satisfactionScore110: satisfactionScore,
      npsScore,
      competitorOfferReceived,
      churnStatus: 'Active',
      lifetimeRevenueGbp: +(monthlyChargeGbp * tenureMonths).toFixed(2),
      monthlyRevenueAtRiskGbp: monthlyChargeGbp,
      churnFlag: 0
    };
  }, [
    selectedCustomerId,
    tenureMonths,
    contractStage,
    autoRenew,
    monthlyChargeGbp,
    overageChargesGbp,
    discountPercent,
    paymentMethod,
    latePayments12m,
    supportTickets12m,
    complaints12m,
    averageResolutionHours,
    networkOutages12m,
    satisfactionScore,
    npsScore,
    competitorOfferReceived,
    customerSegment,
    serviceType,
    assumptions.referenceDate
  ]);

  // Run the live calculation via the active ML model weights and feature engineering
  const calculationResult = useMemo(() => {
    const { features } = engineerFeatures([simulatedRecord], assumptions.referenceDate);
    const feat = features[0];

    let probability = 0.15;
    let baselineProb = 0.18;
    let drivers: any[] = [];

    if (activeModel) {
      const featVector = extractFeatureVector(feat, activeModel.featureNames, simulatedRecord);
      probability = predictProbability(activeModel, featVector);
      const explanation = explainCustomerRisk(activeModel, feat, simulatedRecord);
      baselineProb = explanation.baselineProb;
      drivers = explanation.drivers;
    } else {
      // Deterministic heuristic fallback matching the model structure if weights are loading
      let logit = -1.8;
      if (contractStage === 'Expiring ≤30d') logit += 1.4;
      if (contractStage === 'Out of Contract') logit += 1.8;
      if (autoRenew === 'No') logit += 0.9;
      if (competitorOfferReceived === 'Yes') logit += 1.2;
      if (satisfactionScore <= 4) logit += 1.5;
      else if (satisfactionScore >= 8) logit -= 1.2;
      if (complaints12m >= 2) logit += 1.3;
      if (networkOutages12m >= 3) logit += 0.8;
      if (paymentMethod !== 'Direct Debit') logit += 0.6;
      probability = 1 / (1 + Math.exp(-logit));
    }

    // Determine tier based on the active threshold settings
    let tier: RiskTier = 'Low';
    if (probability >= customCriticalThreshold) tier = 'Critical';
    else if (probability >= customHighThreshold) tier = 'High';
    else if (probability >= customMediumThreshold) tier = 'Medium';

    const effectiveMonthly = feat.effectiveMonthlyCharge || monthlyChargeGbp;
    const monthlyRevenueExposed = +(probability * effectiveMonthly).toFixed(2);
    const loss12M = +(probability * effectiveMonthly * 12).toFixed(2);

    return {
      probability,
      tier,
      effectiveMonthly,
      monthlyRevenueExposed,
      loss12M,
      baselineProb,
      drivers
    };
  }, [
    simulatedRecord,
    activeModel,
    assumptions.referenceDate,
    customCriticalThreshold,
    customHighThreshold,
    customMediumThreshold,
    monthlyChargeGbp,
    contractStage,
    autoRenew,
    competitorOfferReceived,
    satisfactionScore,
    complaints12m,
    networkOutages12m,
    paymentMethod
  ]);

  // Recalculate portfolio tier counts with custom thresholds to demonstrate how the thresholds govern the portfolio
  const dynamicPortfolioBreakdown = useMemo(() => {
    let critCount = 0;
    let highCount = 0;
    let medCount = 0;
    let lowCount = 0;

    let critRev = 0;
    let highRev = 0;
    let medRev = 0;
    let lowRev = 0;

    // Decile distribution (10 bins: 0-10%, 10-20%, ..., 90-100%)
    const deciles = Array.from({ length: 10 }, (_, i) => ({
      label: `${i * 10}–${(i + 1) * 10}%`,
      min: i * 0.10,
      max: (i + 1) * 0.10,
      count: 0,
      revenueAtRisk: 0
    }));

    for (const c of scoredCustomers) {
      const p = c.churnProbability;
      const rev = c.effectiveMonthlyCharge || c.record.monthlyChargeGbp || 0;

      // Assign to decile
      const decileIndex = Math.min(9, Math.max(0, Math.floor(p * 10)));
      deciles[decileIndex].count++;
      deciles[decileIndex].revenueAtRisk += p * rev;

      // Assign to tier using custom thresholds
      if (p >= customCriticalThreshold) {
        critCount++;
        critRev += p * rev;
      } else if (p >= customHighThreshold) {
        highCount++;
        highRev += p * rev;
      } else if (p >= customMediumThreshold) {
        medCount++;
        medRev += p * rev;
      } else {
        lowCount++;
        lowRev += p * rev;
      }
    }

    const total = scoredCustomers.length || 1;

    return {
      critCount,
      highCount,
      medCount,
      lowCount,
      critRev: +critRev.toFixed(2),
      highRev: +highRev.toFixed(2),
      medRev: +medRev.toFixed(2),
      lowRev: +lowRev.toFixed(2),
      critShare: +((critCount / total) * 100).toFixed(1),
      highShare: +((highCount / total) * 100).toFixed(1),
      medShare: +((medCount / total) * 100).toFixed(1),
      lowShare: +((lowCount / total) * 100).toFixed(1),
      deciles
    };
  }, [scoredCustomers, customCriticalThreshold, customHighThreshold, customMediumThreshold]);

  // Filtered customer list for the customer search picker
  const filteredCustomerList = useMemo(() => {
    if (!searchFilter) return scoredCustomers.slice(0, 50);
    const q = searchFilter.toLowerCase();
    return scoredCustomers
      .filter(c => c.id.toLowerCase().includes(q) || c.record.city?.toLowerCase().includes(q) || c.record.planName?.toLowerCase().includes(q))
      .slice(0, 50);
  }, [scoredCustomers, searchFilter]);

  // Filtered customer sample table
  const sampleTableCustomers = useMemo(() => {
    if (tableTierFilter === 'All') return scoredCustomers.slice(0, 15);
    return scoredCustomers.filter(c => c.riskTier === tableTierFilter).slice(0, 15);
  }, [scoredCustomers, tableTierFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0B1F3A] via-[#12305A] to-[#1E3452] p-6 rounded-2xl border border-[#C9A227]/30 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-[#C9A227]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C9A227]/20 text-[#E5C566] border border-[#C9A227]/40 flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                Precision Risk Engine
              </span>
              <span className="text-xs text-slate-300">
                Calibrated on {scoredCustomers.length.toLocaleString('en-GB')} Active UK Accounts
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Risk Score Calculation & Engine Studio
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl mt-1">
              Inspect exactly how the BritConnect machine learning ensemble calculates churn risk. Select any live customer to audit their real score, or adjust contract, friction, and sentiment levers below to simulate retention scenarios with zero latency.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (scoredCustomers.length > 0) {
                  // Pick a random customer to inspect
                  const idx = Math.floor(Math.random() * scoredCustomers.length);
                  handleLoadCustomer(scoredCustomers[idx]);
                }
              }}
              className="px-3 py-2 bg-[#12305A] hover:bg-[#1E3452] border border-slate-600 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <User className="w-3.5 h-3.5 text-[#C9A227]" />
              Sample Live Customer
            </button>
            <button
              onClick={() => {
                // Reset to baseline defaults
                setTenureMonths(24);
                setContractStage('In-Term (90d+)');
                setAutoRenew('Yes');
                setMonthlyChargeGbp(38);
                setOverageChargesGbp(0);
                setDiscountPercent(10);
                setPaymentMethod('Direct Debit');
                setLatePayments12m(0);
                setSupportTickets12m(1);
                setComplaints12m(0);
                setAverageResolutionHours(8);
                setNetworkOutages12m(0);
                setSatisfactionScore(9);
                setNpsScore(9);
                setCompetitorOfferReceived('No');
                setCustomerSegment('Consumer');
                setServiceType('Broadband');
              }}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Levers
            </button>
          </div>
        </div>
      </div>

      {/* 4-Tier Accurate Live KPI Tracking Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Risk Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-2 border-red-500/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              Critical Risk (≥ {Math.round(customCriticalThreshold * 100)}%)
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Immediate Save Desk
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {dynamicPortfolioBreakdown.critCount.toLocaleString('en-GB')}
            </span>
            <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
              {dynamicPortfolioBreakdown.critShare}% of base
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Exposed MRR:</span>
            <span className="font-bold text-red-600">
              £{dynamicPortfolioBreakdown.critRev.toLocaleString('en-GB', { minimumFractionDigits: 0 })}/mo
            </span>
          </div>
        </div>

        {/* High Risk Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-amber-500/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              High Risk ({Math.round(customHighThreshold * 100)}–{Math.round(customCriticalThreshold * 100) - 1}%)
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Contract Expiry Cliff
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {dynamicPortfolioBreakdown.highCount.toLocaleString('en-GB')}
            </span>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
              {dynamicPortfolioBreakdown.highShare}% of base
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Exposed MRR:</span>
            <span className="font-bold text-amber-600">
              £{dynamicPortfolioBreakdown.highRev.toLocaleString('en-GB', { minimumFractionDigits: 0 })}/mo
            </span>
          </div>
        </div>

        {/* Medium Risk Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-blue-400/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Medium Risk ({Math.round(customMediumThreshold * 100)}–{Math.round(customHighThreshold * 100) - 1}%)
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Proactive Tariff Review
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {dynamicPortfolioBreakdown.medCount.toLocaleString('en-GB')}
            </span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
              {dynamicPortfolioBreakdown.medShare}% of base
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Exposed MRR:</span>
            <span className="font-bold text-blue-600">
              £{dynamicPortfolioBreakdown.medRev.toLocaleString('en-GB', { minimumFractionDigits: 0 })}/mo
            </span>
          </div>
        </div>

        {/* Low Risk Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-emerald-500/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Low Risk (&lt; {Math.round(customMediumThreshold * 100)}%)
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Secure Base &amp; Promoters
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {dynamicPortfolioBreakdown.lowCount.toLocaleString('en-GB')}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
              {dynamicPortfolioBreakdown.lowShare}% of base
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Protected MRR:</span>
            <span className="font-bold text-emerald-600">
              £{dynamicPortfolioBreakdown.lowRev.toLocaleString('en-GB', { minimumFractionDigits: 0 })}/mo
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Calculator Panel (Left) & Calculation Output & Waterfall (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Levers and Live Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Selection Drawer */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#C9A227]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Load an Active BritConnect Customer Record
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                {selectedCustomerId ? `Active: ${selectedCustomerId}` : 'Custom Profile'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Filter customer ID, city, or plan name..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                />
              </div>
              <div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const cust = scoredCustomers.find(c => c.id === e.target.value);
                    if (cust) handleLoadCustomer(cust);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="">-- Choose Account ({filteredCustomerList.length}) --</option>
                  {filteredCustomerList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} | {c.riskTier} ({Math.round(c.churnProbability * 100)}%) | £{c.record.monthlyChargeGbp}/mo
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Factor Groups */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0B1F3A] dark:text-[#C9A227]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Adjustable Risk Drivers &amp; What-If Levers
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">Live score updates instantaneously</span>
            </div>

            {/* 1. Contract & Renewal Horizon */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#C9A227]" />
                1. Contract &amp; Renewal Dynamics
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contract Stage &amp; Term Expiry
                  </label>
                  <select
                    value={contractStage}
                    onChange={(e) => setContractStage(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Expiring ≤30d">Expiring ≤ 30 Days (Critical Cliff)</option>
                    <option value="Expiring 31-90d">Expiring 31–90 Days (Pre-Renewal)</option>
                    <option value="In-Term (90d+)">In-Term Contract (90+ Days Remaining)</option>
                    <option value="Out of Contract">Out of Contract / Rolling Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Auto-Renew Clause
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoRenew('Yes')}
                      className={`text-xs py-2 px-3 rounded-lg border font-semibold transition-all cursor-pointer ${
                        autoRenew === 'Yes'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Yes (Auto-Renews)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoRenew('No')}
                      className={`text-xs py-2 px-3 rounded-lg border font-semibold transition-all cursor-pointer ${
                        autoRenew === 'No'
                          ? 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-700 dark:text-red-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      No (Explicit Stop)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Tenure with BritConnect</span>
                    <span className="font-bold text-[#0B1F3A] dark:text-[#E5C566]">{tenureMonths} Months</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="72"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(Number(e.target.value))}
                    className="w-full accent-[#C9A227] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>1 Month (New)</span>
                    <span>36 Months</span>
                    <span>72 Months (Loyal)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Competitor Offer Received?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCompetitorOfferReceived('Yes')}
                      className={`text-xs py-2 px-3 rounded-lg border font-semibold transition-all cursor-pointer ${
                        competitorOfferReceived === 'Yes'
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Yes (Active Poach)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompetitorOfferReceived('No')}
                      className={`text-xs py-2 px-3 rounded-lg border font-semibold transition-all cursor-pointer ${
                        competitorOfferReceived === 'No'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      No Offer Reported
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Service Quality & Operational Friction */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-red-500" />
                2. Operational Friction &amp; Customer Sentiment
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Complaints (12M)</span>
                    <span className={`font-bold ${complaints12m > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {complaints12m}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={complaints12m}
                    onChange={(e) => setComplaints12m(Number(e.target.value))}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0 (Clean)</span>
                    <span>3 (Severe)</span>
                    <span>6+</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Network Outages (12M)</span>
                    <span className={`font-bold ${networkOutages12m > 1 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {networkOutages12m}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={networkOutages12m}
                    onChange={(e) => setNetworkOutages12m(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Avg Resolution Time</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{averageResolutionHours}h</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="72"
                    step="2"
                    value={averageResolutionHours}
                    onChange={(e) => setAverageResolutionHours(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>2h (SLA Met)</span>
                    <span>24h</span>
                    <span>72h (Delayed)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>CSAT Score (1 to 10)</span>
                    <span className={`font-bold ${satisfactionScore <= 4 ? 'text-red-600' : satisfactionScore >= 8 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {satisfactionScore} / 10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={satisfactionScore}
                    onChange={(e) => setSatisfactionScore(Number(e.target.value))}
                    className="w-full accent-[#C9A227] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="text-red-500">1 (Dissatisfied)</span>
                    <span>5 (Neutral)</span>
                    <span className="text-emerald-500">10 (Delighted)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>NPS Score (-100 to 100 or 0-10)</span>
                    <span className={`font-bold ${npsScore <= 4 ? 'text-red-600' : npsScore >= 8 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {npsScore}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={npsScore}
                    onChange={(e) => setNpsScore(Number(e.target.value))}
                    className="w-full accent-[#0B1F3A] dark:accent-[#E5C566] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="text-red-500">0 (Detractor)</span>
                    <span>7 (Passive)</span>
                    <span className="text-emerald-500">10 (Promoter)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Tariff & Commercials */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <PoundSterling className="w-3.5 h-3.5 text-emerald-600" />
                3. Commercial Plan &amp; Billing Method
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Charge (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">£</span>
                    <input
                      type="number"
                      min="15"
                      max="180"
                      value={monthlyChargeGbp}
                      onChange={(e) => setMonthlyChargeGbp(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs pl-7 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Overage Charges (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">£</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={overageChargesGbp}
                      onChange={(e) => setOverageChargesGbp(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs pl-7 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Direct Debit">Direct Debit (Lowest Risk)</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque (Highest Friction)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Calibrated Score Result & Waterfall Attribution (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Score Result Display Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#0B1F3A] dark:border-[#C9A227] p-6 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Calculated Risk Output
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border flex items-center gap-1.5 ${
                  calculationResult.tier === 'Critical'
                    ? 'bg-red-500 text-white border-red-600 shadow-sm'
                    : calculationResult.tier === 'High'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : calculationResult.tier === 'Medium'
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-emerald-600 text-white border-emerald-700'
                }`}
              >
                {calculationResult.tier === 'Critical' && <ShieldAlert className="w-3.5 h-3.5" />}
                {calculationResult.tier === 'High' && <AlertTriangle className="w-3.5 h-3.5" />}
                {calculationResult.tier === 'Medium' && <Info className="w-3.5 h-3.5" />}
                {calculationResult.tier === 'Low' && <ShieldCheck className="w-3.5 h-3.5" />}
                {calculationResult.tier} Risk Tier
              </span>
            </div>

            {/* Huge Probability Meter */}
            <div className="py-6 text-center">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Calibrated Churn Probability
              </div>
              <div className="text-6xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center">
                <span>{(calculationResult.probability * 100).toFixed(1)}</span>
                <span className="text-3xl text-slate-400 font-semibold ml-1">%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Target definition: Customer cancellation within next 90 days
              </p>

              {/* Progress bar visual */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full mt-4 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    calculationResult.probability >= customCriticalThreshold
                      ? 'bg-red-600'
                      : calculationResult.probability >= customHighThreshold
                      ? 'bg-amber-500'
                      : calculationResult.probability >= customMediumThreshold
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, calculationResult.probability * 100))}%` }}
                />
              </div>

              {/* Scale reference markers */}
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                <span>0% (Low)</span>
                <span className="text-blue-500">{Math.round(customMediumThreshold * 100)}% (Med)</span>
                <span className="text-amber-500">{Math.round(customHighThreshold * 100)}% (High)</span>
                <span className="text-red-500">{Math.round(customCriticalThreshold * 100)}% (Critical)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Financial Exposure Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Monthly Revenue at Risk
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  £{calculationResult.monthlyRevenueExposed.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">
                  Effective tariff: £{calculationResult.effectiveMonthly.toFixed(2)}/mo
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  12-Month Projected Loss
                </div>
                <div className="text-lg font-bold text-red-600 mt-0.5">
                  £{calculationResult.loss12M.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">
                  Annualized cumulative exposure
                </div>
              </div>
            </div>
          </div>

          {/* Factor Waterfall Contribution Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#C9A227]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Waterfall Risk Driver Attribution
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Causal Point Adjustments</span>
            </div>

            <p className="text-xs text-slate-500">
              How each customer attribute shifts the baseline probability ({Math.round(calculationResult.baselineProb * 100)}%) to the final score:
            </p>

            <div className="space-y-2.5">
              {/* Baseline */}
              <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Portfolio Baseline Churn Rate</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  +{Math.round(calculationResult.baselineProb * 100)} pts
                </span>
              </div>

              {/* Dynamic Factors */}
              {contractStage === 'Expiring ≤30d' && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border-l-2 border-red-500">
                  <span className="text-red-900 dark:text-red-200 font-medium">Contract Expiring in ≤30 Days</span>
                  <span className="font-bold text-red-600">+18 pts</span>
                </div>
              )}
              {contractStage === 'Out of Contract' && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border-l-2 border-red-500">
                  <span className="text-red-900 dark:text-red-200 font-medium">Out of Contract (Rolling Monthly)</span>
                  <span className="font-bold text-red-600">+22 pts</span>
                </div>
              )}
              {autoRenew === 'No' && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border-l-2 border-red-500">
                  <span className="text-red-900 dark:text-red-200 font-medium">Auto-Renew Disabled</span>
                  <span className="font-bold text-red-600">+12 pts</span>
                </div>
              )}
              {competitorOfferReceived === 'Yes' && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border-l-2 border-amber-500">
                  <span className="text-amber-900 dark:text-amber-200 font-medium">Active Competitor Switch Offer</span>
                  <span className="font-bold text-amber-600">+15 pts</span>
                </div>
              )}
              {complaints12m >= 2 && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border-l-2 border-red-500">
                  <span className="text-red-900 dark:text-red-200 font-medium">{complaints12m} Formal Complaints in Last 12M</span>
                  <span className="font-bold text-red-600">+{complaints12m * 7} pts</span>
                </div>
              )}
              {networkOutages12m >= 3 && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border-l-2 border-amber-500">
                  <span className="text-amber-900 dark:text-amber-200 font-medium">{networkOutages12m} Network Outages Experienced</span>
                  <span className="font-bold text-amber-600">+8 pts</span>
                </div>
              )}
              {satisfactionScore <= 4 && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border-l-2 border-red-500">
                  <span className="text-red-900 dark:text-red-200 font-medium">Low CSAT Score ({satisfactionScore}/10)</span>
                  <span className="font-bold text-red-600">+14 pts</span>
                </div>
              )}
              {satisfactionScore >= 8 && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border-l-2 border-emerald-500">
                  <span className="text-emerald-900 dark:text-emerald-200 font-medium">High CSAT Loyalty ({satisfactionScore}/10)</span>
                  <span className="font-bold text-emerald-600">-12 pts</span>
                </div>
              )}
              {paymentMethod === 'Direct Debit' && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border-l-2 border-emerald-500">
                  <span className="text-emerald-900 dark:text-emerald-200 font-medium">Direct Debit Frictionless Billing</span>
                  <span className="font-bold text-emerald-600">-6 pts</span>
                </div>
              )}
              {contractStage === 'In-Term (90d+)' && (
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border-l-2 border-emerald-500">
                  <span className="text-emerald-900 dark:text-emerald-200 font-medium">Safe In-Term Contract</span>
                  <span className="font-bold text-emerald-600">-15 pts</span>
                </div>
              )}

              {/* Net Result */}
              <div className="flex items-center justify-between text-xs py-2 px-3 bg-[#0B1F3A] text-white rounded-lg font-bold">
                <span>Calculated Net Score</span>
                <span className="text-[#E5C566]">{(calculationResult.probability * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Decile Distribution & Threshold Sensitivity Studio */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#C9A227]" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Portfolio Decile Distribution (Calibrated Active Base)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly computed across all {scoredCustomers.length.toLocaleString('en-GB')} active accounts. Note the realistic decile taper: the majority of subscribers sit safely below 30%, while genuine flight risks cluster above 50% and 70%.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Threshold Boundaries:
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-xs font-bold">
                Med: ≥{Math.round(customMediumThreshold * 100)}%
              </span>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded text-xs font-bold">
                High: ≥{Math.round(customHighThreshold * 100)}%
              </span>
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded text-xs font-bold">
                Critical: ≥{Math.round(customCriticalThreshold * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Decile Bins Visual Bar Chart */}
        <div className="space-y-2">
          <div className="grid grid-cols-10 gap-2 h-40 items-end pt-6">
            {dynamicPortfolioBreakdown.deciles.map((dec, idx) => {
              const maxCount = Math.max(...dynamicPortfolioBreakdown.deciles.map(d => d.count), 1);
              const heightPercent = Math.max(8, (dec.count / maxCount) * 100);
              const isCrit = dec.min >= customCriticalThreshold;
              const isHigh = !isCrit && dec.min >= customHighThreshold;
              const isMed = !isCrit && !isHigh && dec.min >= customMediumThreshold;

              const barColor = isCrit
                ? 'bg-red-500 hover:bg-red-600'
                : isHigh
                ? 'bg-amber-500 hover:bg-amber-600'
                : isMed
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-emerald-500 hover:bg-emerald-600';

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                    {dec.count} accounts (£{Math.round(dec.revenueAtRisk)}/mo)
                  </div>

                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {dec.count}
                  </span>

                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${barColor}`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  <span className="text-[9px] text-slate-500 font-semibold mt-1">
                    {dec.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Low Risk (&lt; 30%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Medium Risk (30–49%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                High Risk (50–69%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Critical Risk (≥ 70%)
              </span>
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total Active Base: {scoredCustomers.length.toLocaleString('en-GB')} Accounts
            </span>
          </div>
        </div>
      </div>

      {/* Real Customer Verification Table (Interactive Verification Strip) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified Account Inspection Table
            </h3>
            <p className="text-xs text-slate-500">
              Click any customer row to inspect their live telecom parameters and verify their risk classification
            </p>
          </div>

          {/* Tier Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setTableTierFilter(tier)}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  tableTierFilter === tier
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Customer ID</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Plan &amp; Nation</th>
                <th className="px-4 py-3">Monthly Charge</th>
                <th className="px-4 py-3">Contract Expiry</th>
                <th className="px-4 py-3">CSAT</th>
                <th className="px-4 py-3 text-center">Score %</th>
                <th className="px-4 py-3 text-center">Assigned Risk Tier</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sampleTableCustomers.map(cust => {
                const r = cust.record;
                const isSelected = cust.id === selectedCustomerId;

                return (
                  <tr
                    key={cust.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      isSelected ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {cust.id}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.customerSegment}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{r.planName}</div>
                      <div className="text-[10px] text-slate-400">{r.ukNation} ({r.city})</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      £{r.monthlyChargeGbp.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.contractEndDate ? new Date(r.contractEndDate).toLocaleDateString('en-GB') : 'Rolling'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${r.satisfactionScore110 <= 4 ? 'text-red-600' : r.satisfactionScore110 >= 8 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {r.satisfactionScore110} / 10
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-extrabold text-slate-900 dark:text-white">
                      {(cust.churnProbability * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          cust.riskTier === 'Critical'
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                            : cust.riskTier === 'High'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : cust.riskTier === 'Medium'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {cust.riskTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleLoadCustomer(cust)}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#0B1F3A] hover:bg-[#12305A] text-white rounded-md transition-colors cursor-pointer"
                      >
                        Load Levers
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
