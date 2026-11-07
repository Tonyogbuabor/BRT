import {
  CustomerRecord,
  EngineeredCustomerFeatures,
  ScoredCustomer,
  RiskTier
} from '../types/schema';
import {
  TrainedModelWeights,
  explainCustomerRisk,
  predictProbability
} from './models';
import { extractFeatureVector, engineerFeatures } from './featureEngineering';

export interface WhatIfLevers {
  additionalDiscountPercent?: number; // e.g. +10%
  extendContractMonths?: number; // e.g. +12 or +24 months
  enableAutoRenew?: boolean;
  resolveComplaints?: boolean;
  resolveOutages?: boolean;
  upgradeAllowanceGb?: number; // e.g. +50GB or unlimited (0)
  eliminateOverages?: boolean;
}

export interface WhatIfSimulationResult {
  originalProbability: number;
  simulatedProbability: number;
  probabilityDelta: number; // simulated - original
  originalTier: RiskTier;
  simulatedTier: RiskTier;
  originalRevenueAtRisk: number;
  simulatedRevenueAtRisk: number;
  annualSavingsGbp: number;
  topDriversDelta: string[];
}

/**
 * Batch score all active customers
 */
export function scoreCustomers(
  records: CustomerRecord[],
  model: TrainedModelWeights,
  refDateStr = '2026-11-07',
  criticalThresh = 0.70,
  highThresh = 0.50,
  mediumThresh = 0.30
): ScoredCustomer[] {
  const { features } = engineerFeatures(records, refDateStr);
  const scoredList: ScoredCustomer[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const feat = features[i];

    const { drivers, probability, baselineProb } = explainCustomerRisk(model, feat, rec);

    let tier: RiskTier = 'Low';
    if (probability >= criticalThresh) tier = 'Critical';
    else if (probability >= highThresh) tier = 'High';
    else if (probability >= mediumThresh) tier = 'Medium';

    const effectiveMonthly = feat.effectiveMonthlyCharge;
    const monthlyRisk = +(probability * effectiveMonthly).toFixed(2);
    const expectedLoss12M = +(probability * effectiveMonthly * 12).toFixed(2);

    scoredList.push({
      id: rec.id,
      churnProbability: probability,
      riskTier: tier,
      riskPercentile: 50, // will compute after sorting
      effectiveMonthlyCharge: effectiveMonthly,
      expectedMonthlyRevenueAtRisk: monthlyRisk,
      expectedLoss12M,
      topDrivers: drivers,
      waterfallBaseline: baselineProb,
      record: rec
    });
  }

  // Sort descending by churn probability to compute percentiles
  scoredList.sort((a, b) => b.churnProbability - a.churnProbability);
  const total = scoredList.length;
  for (let rank = 0; rank < total; rank++) {
    // Percentile 100 = highest risk
    scoredList[rank].riskPercentile = Math.max(1, Math.min(100, Math.round(((total - rank) / total) * 100)));
  }

  return scoredList;
}

/**
 * Real-time What-If simulator for an individual customer
 */
export function simulateCustomerWhatIf(
  record: CustomerRecord,
  model: TrainedModelWeights,
  levers: WhatIfLevers,
  refDateStr = '2026-11-07'
): WhatIfSimulationResult {
  const refDate = new Date(refDateStr);

  // 1. Original score
  const { features: origFeat } = engineerFeatures([record], refDateStr);
  const origX = extractFeatureVector(origFeat[0], model.featureNames, record);
  const origProb = predictProbability(model, origX);

  let origTier: RiskTier = 'Low';
  if (origProb >= 0.70) origTier = 'Critical';
  else if (origProb >= 0.50) origTier = 'High';
  else if (origProb >= 0.30) origTier = 'Medium';

  // 2. Clone and modify record according to levers
  const simRecord: CustomerRecord = { ...record };

  if (levers.additionalDiscountPercent !== undefined && levers.additionalDiscountPercent > 0) {
    simRecord.discountPercent = Math.min(100, (record.discountPercent || 0) + levers.additionalDiscountPercent);
  }

  if (levers.extendContractMonths && levers.extendContractMonths > 0) {
    const baseEnd = new Date(record.contractEndDate || record.contractStartDate || refDateStr);
    const newEnd = new Date(baseEnd.getTime() + levers.extendContractMonths * 30.4375 * 24 * 3600 * 1000);
    simRecord.contractEndDate = newEnd.toISOString().split('T')[0];
    simRecord.contractType = levers.extendContractMonths >= 24 ? '24 Months' : levers.extendContractMonths >= 18 ? '18 Months' : '12 Months';
  }

  if (levers.enableAutoRenew) {
    simRecord.autoRenew = 'Yes';
  }

  if (levers.resolveComplaints) {
    simRecord.complaints12m = 0;
    simRecord.averageResolutionHours = Math.min(12, record.averageResolutionHours);
  }

  if (levers.resolveOutages) {
    simRecord.networkOutages12m = 0;
  }

  if (levers.upgradeAllowanceGb !== undefined) {
    simRecord.dataAllowanceGb = levers.upgradeAllowanceGb;
  }

  if (levers.eliminateOverages) {
    simRecord.overageChargesGbp = 0;
  }

  // 3. Rescore with simulated record
  const { features: simFeat } = engineerFeatures([simRecord], refDateStr);
  const simX = extractFeatureVector(simFeat[0], model.featureNames, simRecord);
  const simProb = predictProbability(model, simX);

  let simTier: RiskTier = 'Low';
  if (simProb >= 0.70) simTier = 'Critical';
  else if (simProb >= 0.50) simTier = 'High';
  else if (simProb >= 0.30) simTier = 'Medium';

  const origEff = origFeat[0].effectiveMonthlyCharge;
  const simEff = simFeat[0].effectiveMonthlyCharge;

  const origRisk = origProb * origEff;
  const simRisk = simProb * simEff;
  const annualSavings = +(Math.max(0, (origRisk - simRisk) * 12)).toFixed(2);

  const delta = +(simProb - origProb).toFixed(3);

  const driversDelta: string[] = [];
  if (levers.extendContractMonths) driversDelta.push(`Extended contract by ${levers.extendContractMonths} months`);
  if (levers.additionalDiscountPercent) driversDelta.push(`Applied +${levers.additionalDiscountPercent}% retention discount`);
  if (levers.resolveComplaints) driversDelta.push(`Resolved all support complaints`);
  if (levers.resolveOutages) driversDelta.push(`Network stability intervention executed`);
  if (levers.eliminateOverages) driversDelta.push(`Overages waived and allowance upgraded`);

  return {
    originalProbability: +origProb.toFixed(3),
    simulatedProbability: +simProb.toFixed(3),
    probabilityDelta: delta,
    originalTier: origTier,
    simulatedTier: simTier,
    originalRevenueAtRisk: +origRisk.toFixed(2),
    simulatedRevenueAtRisk: +simRisk.toFixed(2),
    annualSavingsGbp: annualSavings,
    topDriversDelta: driversDelta
  };
}
