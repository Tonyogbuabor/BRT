import {
  CustomerRecord,
  ScoredCustomer,
  FilterState,
  BusinessAssumptions
} from '../types/schema';

export interface ComputedKPIs {
  totalCustomers: number;
  activeCustomers: number;
  churnedCustomers: number;
  churnRatePercent: number;
  churnRateDenominator: string;
  averageTenureMonths: number;
  monthlyRecurringRevenueGbp: number;
  effectiveMonthlyRecurringRevenueGbp: number;
  modelRevenueAtRiskGbp: number;
  datasetRevenueAtRiskGbp: number;
  averageSatisfactionScore: number;
  netNpsScore: number;
  npsMethod: string;
  customersInCriticalRisk: number;
  customersInHighRisk: number;
  customersInMediumRisk: number;
  customersInLowRisk: number;
  criticalRevenueAtRiskGbp: number;
  highRevenueAtRiskGbp: number;
  mediumRevenueAtRiskGbp: number;
  lowRevenueAtRiskGbp: number;
  criticalSharePercent: number;
  highSharePercent: number;
  mediumSharePercent: number;
  lowSharePercent: number;
  portfolioAvgRiskScore: number;
  criticalAvgRiskScore: number;
  highAvgRiskScore: number;
  mediumAvgRiskScore: number;
  lowAvgRiskScore: number;
  expected12MonthLossGbp: number;
  contractsExpiring30dCount: number;
  contractsExpiring60dCount: number;
  contractsExpiring90dCount: number;
}

/**
 * Filter customer records by global filter state
 */
export function filterRecords<T extends { record?: CustomerRecord; [key: string]: any }>(
  items: T[],
  filters: FilterState
): T[] {
  return items.filter(item => {
    const r: CustomerRecord = (item.record ? item.record : item) as CustomerRecord;
    const scored = item as unknown as ScoredCustomer;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchId = r.id?.toLowerCase().includes(q);
      const matchCity = r.city?.toLowerCase().includes(q);
      const matchPlan = r.planName?.toLowerCase().includes(q);
      if (!matchId && !matchCity && !matchPlan) return false;
    }

    if (filters.customerSegment && r.customerSegment !== filters.customerSegment) return false;
    if (filters.serviceType && r.serviceType !== filters.serviceType) return false;
    if (filters.planName && r.planName !== filters.planName) return false;
    if (filters.ukNation && r.ukNation !== filters.ukNation) return false;
    if (filters.city && r.city !== filters.city) return false;
    if (filters.acquisitionChannel && r.acquisitionChannel !== filters.acquisitionChannel) return false;
    if (filters.contractType && r.contractType !== filters.contractType) return false;
    if (filters.ageBand && r.ageBand !== filters.ageBand) return false;
    if (filters.gender && r.gender !== filters.gender) return false;
    if (filters.riskTier && scored.riskTier && scored.riskTier !== filters.riskTier) return false;

    if (filters.joinDateFrom && r.joinDate && r.joinDate < filters.joinDateFrom) return false;
    if (filters.joinDateTo && r.joinDate && r.joinDate > filters.joinDateTo) return false;

    return true;
  });
}

/**
 * Deterministically compute all portfolio KPIs with zero guessing
 */
export function computePortfolioKPIs(
  records: CustomerRecord[],
  scoredCustomers: ScoredCustomer[],
  refDateStr = '2026-11-07'
): ComputedKPIs {
  const refDate = new Date(refDateStr);
  const total = records.length;

  const activeRecs = records.filter(r => r.churnFlag === 0 || r.churnStatus === 'Active');
  const churnedRecs = records.filter(r => r.churnFlag === 1 || r.churnStatus === 'Churned');

  const totalWithTarget = activeRecs.length + churnedRecs.length;
  const churnRate = totalWithTarget > 0 ? (churnedRecs.length / totalWithTarget) * 100 : 0;

  const totalTenure = records.reduce((acc, r) => acc + (r.tenureMonths || 0), 0);
  const avgTenure = total > 0 ? +(totalTenure / total).toFixed(1) : 0;

  // Active MRR
  const mrr = activeRecs.reduce((acc, r) => acc + (r.monthlyChargeGbp || 0), 0);
  const effMrr = activeRecs.reduce((acc, r) => acc + (r.monthlyChargeGbp || 0) * (1 - (r.discountPercent || 0) / 100), 0);

  // Model-based revenue at risk across active customers
  const scoredActive = scoredCustomers.filter(c => Number(c.record?.churnFlag) === 0 || c.record?.churnStatus === 'Active');
  const modelRisk = scoredActive.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0);

  // Raw dataset revenue at risk column sum
  const datasetRisk = activeRecs.reduce((acc, r) => acc + (r.monthlyRevenueAtRiskGbp || 0), 0);

  // Satisfaction
  const csatRecs = records.filter(r => r.satisfactionScore110 > 0);
  const avgCsat = csatRecs.length > 0
    ? +(csatRecs.reduce((acc, r) => acc + r.satisfactionScore110, 0) / csatRecs.length).toFixed(1)
    : 7.0;

  // NPS Scale detection & computation
  const npsScores = records.map(r => r.npsScore).filter(s => s !== undefined && s !== null);
  let netNps = 0;
  let npsMethod = '';
  const minNps = Math.min(...npsScores);
  const maxNps = Math.max(...npsScores);

  if (minNps >= 0 && maxNps <= 10) {
    // 0 to 10 scale
    const promoters = records.filter(r => r.npsScore >= 9).length;
    const detractors = records.filter(r => r.npsScore <= 6).length;
    netNps = Math.round(((promoters - detractors) / (records.length || 1)) * 100);
    npsMethod = '% Promoters (9-10) minus % Detractors (0-6)';
  } else {
    // -100 to 100 standard
    const sum = npsScores.reduce((acc, s) => acc + s, 0);
    netNps = Math.round(sum / (npsScores.length || 1));
    npsMethod = 'Direct Net Promoter advocacy index (-100 to +100)';
  }

  // Tiers & Risk Calculations
  const criticalCustomers = scoredActive.filter(c => c.riskTier === 'Critical');
  const highCustomers = scoredActive.filter(c => c.riskTier === 'High');
  const mediumCustomers = scoredActive.filter(c => c.riskTier === 'Medium');
  const lowCustomers = scoredActive.filter(c => c.riskTier === 'Low');

  const criticalCount = criticalCustomers.length;
  const highCount = highCustomers.length;
  const mediumCount = mediumCustomers.length;
  const lowCount = lowCustomers.length;

  const totalScoredActive = scoredActive.length || 1;
  const criticalShare = +((criticalCount / totalScoredActive) * 100).toFixed(1);
  const highShare = +((highCount / totalScoredActive) * 100).toFixed(1);
  const mediumShare = +((mediumCount / totalScoredActive) * 100).toFixed(1);
  const lowShare = +((lowCount / totalScoredActive) * 100).toFixed(1);

  const criticalRevAtRisk = +criticalCustomers.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2);
  const highRevAtRisk = +highCustomers.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2);
  const mediumRevAtRisk = +mediumCustomers.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2);
  const lowRevAtRisk = +lowCustomers.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2);

  const portfolioAvgRisk = scoredActive.length > 0
    ? +((scoredActive.reduce((acc, c) => acc + c.churnProbability, 0) / scoredActive.length) * 100).toFixed(1)
    : 0;

  const criticalAvgRisk = criticalCount > 0
    ? +((criticalCustomers.reduce((acc, c) => acc + c.churnProbability, 0) / criticalCount) * 100).toFixed(1)
    : 0;

  const highAvgRisk = highCount > 0
    ? +((highCustomers.reduce((acc, c) => acc + c.churnProbability, 0) / highCount) * 100).toFixed(1)
    : 0;

  const mediumAvgRisk = mediumCount > 0
    ? +((mediumCustomers.reduce((acc, c) => acc + c.churnProbability, 0) / mediumCount) * 100).toFixed(1)
    : 0;

  const lowAvgRisk = lowCount > 0
    ? +((lowCustomers.reduce((acc, c) => acc + c.churnProbability, 0) / lowCount) * 100).toFixed(1)
    : 0;

  const expected12M = +(modelRisk * 12).toFixed(2);

  // Contract expiries
  let exp30 = 0, exp60 = 0, exp90 = 0;
  for (const r of activeRecs) {
    if (r.contractEndDate && !r.contractType.includes('Rolling')) {
      const end = new Date(r.contractEndDate);
      const days = Math.round((end.getTime() - refDate.getTime()) / (24 * 3600 * 1000));
      if (days >= -15 && days <= 30) exp30++;
      if (days >= -15 && days <= 60) exp60++;
      if (days >= -15 && days <= 90) exp90++;
    }
  }

  return {
    totalCustomers: total,
    activeCustomers: activeRecs.length,
    churnedCustomers: churnedRecs.length,
    churnRatePercent: +churnRate.toFixed(1),
    churnRateDenominator: `${churnedRecs.length} churned / ${totalWithTarget} total evaluated customers`,
    averageTenureMonths: avgTenure,
    monthlyRecurringRevenueGbp: +mrr.toFixed(2),
    effectiveMonthlyRecurringRevenueGbp: +effMrr.toFixed(2),
    modelRevenueAtRiskGbp: +modelRisk.toFixed(2),
    datasetRevenueAtRiskGbp: +datasetRisk.toFixed(2),
    averageSatisfactionScore: avgCsat,
    netNpsScore: netNps,
    npsMethod,
    customersInCriticalRisk: criticalCount,
    customersInHighRisk: highCount,
    customersInMediumRisk: mediumCount,
    customersInLowRisk: lowCount,
    criticalRevenueAtRiskGbp: criticalRevAtRisk,
    highRevenueAtRiskGbp: highRevAtRisk,
    mediumRevenueAtRiskGbp: mediumRevAtRisk,
    lowRevenueAtRiskGbp: lowRevAtRisk,
    criticalSharePercent: criticalShare,
    highSharePercent: highShare,
    mediumSharePercent: mediumShare,
    lowSharePercent: lowShare,
    portfolioAvgRiskScore: portfolioAvgRisk,
    criticalAvgRiskScore: criticalAvgRisk,
    highAvgRiskScore: highAvgRisk,
    mediumAvgRiskScore: mediumAvgRisk,
    lowAvgRiskScore: lowAvgRisk,
    expected12MonthLossGbp: expected12M,
    contractsExpiring30dCount: exp30,
    contractsExpiring60dCount: exp60,
    contractsExpiring90dCount: exp90
  };
}

/**
 * Grouped metric aggregator for charts & pivot views
 */
export function groupMetricBy(
  records: CustomerRecord[],
  scoredCustomers: ScoredCustomer[],
  groupByField: keyof CustomerRecord | 'riskTier' | 'tenureBucket',
  metric: 'churnRate' | 'customerCount' | 'mrr' | 'revenueAtRisk' | 'satisfaction'
): { category: string; value: number; count: number; sharePercent: number }[] {
  const scoredMap = new Map(scoredCustomers.map(c => [c.id, c]));

  const groups: Record<string, { count: number; churnedCount: number; mrr: number; riskMrr: number; csatSum: number }> = {};

  for (const r of records) {
    let key = 'Other';
    if (groupByField === 'riskTier') {
      const sc = scoredMap.get(r.id);
      key = sc ? sc.riskTier : 'Unscored';
    } else if (groupByField === 'tenureBucket') {
      const t = r.tenureMonths || 0;
      if (t <= 6) key = '0-6m';
      else if (t <= 12) key = '7-12m';
      else if (t <= 24) key = '13-24m';
      else if (t <= 48) key = '25-48m';
      else key = '49m+';
    } else {
      key = String(r[groupByField] || 'Unknown');
    }

    if (!groups[key]) {
      groups[key] = { count: 0, churnedCount: 0, mrr: 0, riskMrr: 0, csatSum: 0 };
    }

    groups[key].count++;
    if (r.churnFlag === 1 || r.churnStatus === 'Churned') {
      groups[key].churnedCount++;
    }

    const effMonthly = (r.monthlyChargeGbp || 0) * (1 - (r.discountPercent || 0) / 100);
    groups[key].mrr += effMonthly;

    const sc = scoredMap.get(r.id);
    if (sc) {
      groups[key].riskMrr += sc.expectedMonthlyRevenueAtRisk;
    }
    groups[key].csatSum += r.satisfactionScore110 || 7;
  }

  const totalCount = records.length || 1;
  const results = Object.entries(groups).map(([cat, data]) => {
    let val = 0;
    if (metric === 'churnRate') {
      val = data.count > 0 ? +((data.churnedCount / data.count) * 100).toFixed(1) : 0;
    } else if (metric === 'customerCount') {
      val = data.count;
    } else if (metric === 'mrr') {
      val = +data.mrr.toFixed(2);
    } else if (metric === 'revenueAtRisk') {
      val = +data.riskMrr.toFixed(2);
    } else if (metric === 'satisfaction') {
      val = data.count > 0 ? +(data.csatSum / data.count).toFixed(1) : 0;
    }

    return {
      category: cat,
      value: val,
      count: data.count,
      sharePercent: +((data.count / totalCount) * 100).toFixed(1)
    };
  });

  // Sort descending by value
  results.sort((a, b) => b.value - a.value);
  return results;
}
