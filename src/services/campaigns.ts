import { Campaign, RiskTier, ScoredCustomer } from '../types/schema';

/**
 * Creates a new retention campaign with automatic randomized holdout control group
 */
export function createCampaignWithHoldout(
  name: string,
  objective: string,
  targetTier: RiskTier | 'All High/Critical' | 'Custom Cohort',
  targetSegment: string | undefined,
  offerType: string,
  channel: 'Call' | 'Email' | 'SMS' | 'App Notification' | 'Direct Mail',
  budgetGbp: number,
  costPerContactGbp: number,
  offerCostPerAcceptedGbp: number,
  owner: string,
  holdoutPercent = 15,
  eligibleCustomers: ScoredCustomer[] = []
): { campaign: Campaign; treatedCustomerIds: string[]; holdoutCustomerIds: string[] } {
  // Filter eligible customers by target tier
  const eligible = eligibleCustomers.filter(c => {
    if (targetTier === 'All High/Critical') return c.riskTier === 'Critical' || c.riskTier === 'High';
    if (targetTier === 'Custom Cohort') return true;
    return c.riskTier === targetTier;
  });

  // Stratify holdout randomly
  const treatedIds: string[] = [];
  const holdoutIds: string[] = [];

  for (const c of eligible) {
    if (Math.random() * 100 < holdoutPercent) {
      holdoutIds.push(c.id);
    } else {
      treatedIds.push(c.id);
    }
  }

  const campaign: Campaign = {
    id: `camp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name,
    objective,
    targetTier,
    targetSegment,
    offerType,
    channel,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
    budgetGbp,
    costPerContactGbp,
    offerCostPerAcceptedGbp,
    owner,
    status: 'Planned',
    holdoutPercent,
    resultsLoaded: false,
    treatedCount: treatedIds.length,
    controlCount: holdoutIds.length,
    contactedCount: 0,
    respondedCount: 0,
    acceptedCount: 0,
    retainedTreatedCount: 0,
    retainedControlCount: 0,
    retentionRateTreated: 0,
    retentionRateControl: 0,
    incrementalUpliftPercent: 0,
    zTestPValue: 1.0,
    ci95Low: 0,
    ci95High: 0,
    incrementalSaves: 0,
    revenueRetainedGbp: 0,
    totalCampaignCostGbp: 0,
    netBenefitGbp: 0,
    roiPercent: 0,
    costPerSaveGbp: 0,
    paybackPeriodMonths: 0
  };

  return { campaign, treatedCustomerIds: treatedIds, holdoutCustomerIds: holdoutIds };
}

/**
 * Calculates two-proportion z-test for incremental retention uplift and business ROI
 */
export function calculateCampaignImpact(
  treatedCount: number,
  controlCount: number,
  contactedCount: number,
  respondedCount: number,
  acceptedCount: number,
  retainedTreatedCount: number,
  retainedControlCount: number,
  costPerContactGbp: number,
  offerCostPerAcceptedGbp: number,
  averageMonthlyChargeGbp = 40.0,
  averageMarginPercent = 65,
  horizonMonths = 12
): Partial<Campaign> {
  const p1 = treatedCount > 0 ? retainedTreatedCount / treatedCount : 0;
  const p2 = controlCount > 0 ? retainedControlCount / controlCount : 0;

  const uplift = p1 - p2; // incremental retention rate

  // Pooled standard error for 2-proportion z-test
  const totalRetained = retainedTreatedCount + retainedControlCount;
  const totalObs = treatedCount + controlCount;
  const pPool = totalObs > 0 ? totalRetained / totalObs : 0;
  const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / Math.max(1, treatedCount) + 1 / Math.max(1, controlCount)));

  const zScore = sePool > 0 ? Math.abs(uplift) / sePool : 0;
  // Standard normal two-tailed p-value approximation
  const pValue = +(2 * (1 - normalCdf(zScore))).toFixed(4);

  // 95% Confidence Interval
  const seDiff = Math.sqrt((p1 * (1 - p1)) / Math.max(1, treatedCount) + (p2 * (1 - p2)) / Math.max(1, controlCount));
  const ci95Low = +((uplift - 1.96 * seDiff) * 100).toFixed(1);
  const ci95High = +((uplift + 1.96 * seDiff) * 100).toFixed(1);

  // Financial impact
  const incrementalSaves = Math.max(0, Math.round(uplift * treatedCount));
  const totalCost = +(contactedCount * costPerContactGbp + acceptedCount * offerCostPerAcceptedGbp).toFixed(2);
  const grossRetainedRev = +(incrementalSaves * averageMonthlyChargeGbp * horizonMonths).toFixed(2);
  const retainedMargin = +(grossRetainedRev * (averageMarginPercent / 100)).toFixed(2);
  const netBenefit = +(retainedMargin - totalCost).toFixed(2);
  const roi = totalCost > 0 ? +((netBenefit / totalCost) * 100).toFixed(1) : 0;
  const costPerSave = incrementalSaves > 0 ? +(totalCost / incrementalSaves).toFixed(2) : 0;
  const monthlyRetainedMargin = incrementalSaves * averageMonthlyChargeGbp * (averageMarginPercent / 100);
  const paybackMonths = monthlyRetainedMargin > 0 ? +(totalCost / monthlyRetainedMargin).toFixed(1) : 0;

  return {
    resultsLoaded: true,
    treatedCount,
    controlCount,
    contactedCount,
    respondedCount,
    acceptedCount,
    retainedTreatedCount,
    retainedControlCount,
    retentionRateTreated: +(p1 * 100).toFixed(1),
    retentionRateControl: +(p2 * 100).toFixed(1),
    incrementalUpliftPercent: +(uplift * 100).toFixed(1),
    zTestPValue: pValue,
    ci95Low,
    ci95High,
    incrementalSaves,
    revenueRetainedGbp: grossRetainedRev,
    totalCampaignCostGbp: totalCost,
    netBenefitGbp: netBenefit,
    roiPercent: roi,
    costPerSaveGbp: costPerSave,
    paybackPeriodMonths: paybackMonths
  };
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
