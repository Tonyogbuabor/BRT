import { CustomerRecord, EngineeredCustomerFeatures } from '../types/schema';

export interface FeatureMetadata {
  name: string;
  label: string;
  category: 'Usage' | 'Value & Pricing' | 'Contract' | 'Payment Risk' | 'Service Experience' | 'Sentiment' | 'Competition' | 'Demographics';
  type: 'numeric' | 'binary' | 'categorical';
  isSafe: boolean;
  leakageReason?: string;
  description: string;
}

export const LEAKAGE_COLUMNS = [
  { key: 'id', reason: 'Unique identifier, memorisation risk' },
  { key: 'churnStatus', reason: 'Direct target leakage' },
  { key: 'churnFlag', reason: 'Direct target label' },
  { key: 'churnDate', reason: 'Occurs exclusively post-churn' },
  { key: 'churnReason', reason: 'Recorded exclusively post-churn' },
  { key: 'monthlyRevenueAtRiskGbp', reason: 'Derived directly from churn exposure' },
  { key: 'lifetimeRevenueGbp', reason: 'Scales with tenure and encodes survival outcome' }
];

export const SAFE_MODEL_FEATURES: FeatureMetadata[] = [
  { name: 'usageToAllowanceRatio', label: 'Usage to Allowance Ratio', category: 'Usage', type: 'numeric', isSafe: true, description: 'Proportion of data allowance consumed' },
  { name: 'overAllowanceFlag', label: 'Over Allowance Flag', category: 'Usage', type: 'binary', isSafe: true, description: 'Customer exceeded data allowance limit' },
  { name: 'overageToChargeRatio', label: 'Overage to Charge Ratio', category: 'Usage', type: 'numeric', isSafe: true, description: 'Proportion of bill from overage penalties' },
  { name: 'chargePerGb', label: 'Charge per GB (£/GB)', category: 'Usage', type: 'numeric', isSafe: true, description: 'Effective price per unit of data used' },
  { name: 'effectiveMonthlyCharge', label: 'Effective Monthly Charge (£)', category: 'Value & Pricing', type: 'numeric', isSafe: true, description: 'Net subscription bill after discounts' },
  { name: 'discountFlag', label: 'Active Discount Flag', category: 'Value & Pricing', type: 'binary', isSafe: true, description: 'Customer receives a promotional discount' },
  { name: 'highPriceFlag', label: 'Above Plan Median Price', category: 'Value & Pricing', type: 'binary', isSafe: true, description: 'Charged more than service category median' },
  { name: 'monthsToContractEnd', label: 'Months to Contract End', category: 'Contract', type: 'numeric', isSafe: true, description: 'Remaining months on active contract term' },
  { name: 'contractExpiring30d', label: 'Contract Expiring ≤ 30 Days', category: 'Contract', type: 'binary', isSafe: true, description: 'Imminent contract expiry window' },
  { name: 'contractExpiring60d', label: 'Contract Expiring ≤ 60 Days', category: 'Contract', type: 'binary', isSafe: true, description: 'Contract renewal decision window' },
  { name: 'contractExpiring90d', label: 'Contract Expiring ≤ 90 Days', category: 'Contract', type: 'binary', isSafe: true, description: 'Approaching contract end' },
  { name: 'autoRenewRiskFlag', label: 'Contract Expiring Without Auto-Renew', category: 'Contract', type: 'binary', isSafe: true, description: 'Expiry within 60 days with Auto-Renew disabled' },
  { name: 'paymentRiskIndex', label: 'Payment Risk Index', category: 'Payment Risk', type: 'numeric', isSafe: true, description: 'Composite penalty from late and failed payments' },
  { name: 'nonDirectDebitFlag', label: 'Non-Direct Debit Flag', category: 'Payment Risk', type: 'binary', isSafe: true, description: 'Manual payment method with higher friction' },
  { name: 'ticketsPerTenureYear', label: 'Tickets per Tenure Year', category: 'Service Experience', type: 'numeric', isSafe: true, description: 'Annualised support interaction intensity' },
  { name: 'complaintRate', label: 'Complaint Rate', category: 'Service Experience', type: 'numeric', isSafe: true, description: 'Ratio of formal complaints to total support tickets' },
  { name: 'slowResolutionFlag', label: 'Slow Support Resolution Flag', category: 'Service Experience', type: 'binary', isSafe: true, description: 'Resolution time in upper quartile (> 28 hours)' },
  { name: 'outageExposure', label: 'Network Outages (12M)', category: 'Service Experience', type: 'numeric', isSafe: true, description: 'Number of network drops experienced in past year' },
  { name: 'experienceIndex', label: 'Experience Friction Index', category: 'Service Experience', type: 'numeric', isSafe: true, description: 'Composite score of outages, complaints, and ticket delays' },
  { name: 'satisfactionScore110', label: 'CSAT (1-10)', category: 'Sentiment', type: 'numeric', isSafe: true, description: 'Customer satisfaction score' },
  { name: 'npsScore', label: 'NPS Score', category: 'Sentiment', type: 'numeric', isSafe: true, description: 'Advocacy score' },
  { name: 'sentimentGap', label: 'Sentiment Gap', category: 'Sentiment', type: 'numeric', isSafe: true, description: 'Divergence between CSAT and NPS advocacy' },
  { name: 'competitorOfferFlag', label: 'Competitor Offer Received', category: 'Competition', type: 'binary', isSafe: true, description: 'Customer received alternative provider offer' },
  { name: 'competitorOfferLowSat', label: 'Competitor Offer + Low CSAT', category: 'Competition', type: 'binary', isSafe: true, description: 'Competitive pressure on dissatisfied customer' },
  { name: 'tenureMonths', label: 'Tenure (Months)', category: 'Demographics', type: 'numeric', isSafe: true, description: 'Customer longevity in months' },
  { name: 'age', label: 'Age (Years)', category: 'Demographics', type: 'numeric', isSafe: true, description: 'Customer age in years' },
  { name: 'isConsumer', label: 'Segment: Consumer', category: 'Demographics', type: 'binary', isSafe: true, description: 'Consumer vs Small Business classification' },
  { name: 'isRollingContract', label: 'Contract: 30-Day Rolling', category: 'Contract', type: 'binary', isSafe: true, description: 'Flexible 30-day agreement' }
];

/**
 * Transforms raw cleaned records into engineered feature vectors
 */
export function engineerFeatures(
  records: CustomerRecord[],
  refDateStr = '2026-11-07'
): { features: EngineeredCustomerFeatures[]; vectorKeys: string[]; medianChargeByService: Record<string, number> } {
  const refDate = new Date(refDateStr);

  // Compute reference service medians for price flags
  const chargesByService: Record<string, number[]> = {};
  const resolutions: number[] = [];

  for (const r of records) {
    const s = r.serviceType || 'Standard';
    if (!chargesByService[s]) chargesByService[s] = [];
    const eff = r.monthlyChargeGbp * (1 - (r.discountPercent || 0) / 100);
    chargesByService[s].push(eff);
    if (r.averageResolutionHours > 0) resolutions.push(r.averageResolutionHours);
  }

  const medianChargeByService: Record<string, number> = {};
  for (const [s, vals] of Object.entries(chargesByService)) {
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianChargeByService[s] = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const sortedResolutions = [...resolutions].sort((a, b) => a - b);
  const resolution75th = sortedResolutions.length > 0 ? sortedResolutions[Math.floor(sortedResolutions.length * 0.75)] : 28;

  const features: EngineeredCustomerFeatures[] = records.map(r => {
    const effectiveMonthlyCharge = +(r.monthlyChargeGbp * (1 - (r.discountPercent || 0) / 100)).toFixed(2);
    const serviceMedian = medianChargeByService[r.serviceType] || 35.0;
    const highPriceFlag = effectiveMonthlyCharge > serviceMedian ? 1 : 0;
    const discountFlag = (r.discountPercent || 0) > 0 ? 1 : 0;

    // Usage
    const allowance = r.dataAllowanceGb || 0;
    const usage = r.averageMonthlyUsageGb || 0;
    const usageToAllowanceRatio = allowance > 0 ? +(usage / allowance).toFixed(2) : 0;
    const overAllowanceFlag = allowance > 0 && usage > allowance ? 1 : 0;
    const overageToChargeRatio = r.monthlyChargeGbp > 0 ? +((r.overageChargesGbp || 0) / r.monthlyChargeGbp).toFixed(2) : 0;
    const chargePerGb = +(r.monthlyChargeGbp / Math.max(1, usage)).toFixed(2);

    // Contract
    const contractEndD = new Date(r.contractEndDate || r.contractStartDate || '2026-11-07');
    const daysToEnd = Math.round((contractEndD.getTime() - refDate.getTime()) / (24 * 3600 * 1000));
    const monthsToEnd = +(daysToEnd / 30.4375).toFixed(1);

    const isRolling = r.contractType.includes('Rolling') || r.contractType.includes('30-Day');
    const contractExpiring30d = !isRolling && daysToEnd >= -15 && daysToEnd <= 30 ? 1 : 0;
    const contractExpiring60d = !isRolling && daysToEnd >= -15 && daysToEnd <= 60 ? 1 : 0;
    const contractExpiring90d = !isRolling && daysToEnd >= -15 && daysToEnd <= 90 ? 1 : 0;

    let contractStage: 'In-Term' | 'Renewal Window' | 'Out-of-Contract' = 'In-Term';
    if (daysToEnd < 0) contractStage = 'Out-of-Contract';
    else if (daysToEnd <= 60) contractStage = 'Renewal Window';

    const autoRenewRiskFlag = !isRolling && daysToEnd <= 60 && r.autoRenew === 'No' ? 1 : 0;

    // Payment risk
    const paymentRiskIndex = (r.latePayments12m || 0) + (r.failedPayments12m || 0) * 1.5;
    const nonDirectDebitFlag = r.directDebit !== 'Yes' ? 1 : 0;

    // Service experience
    const yearsTenure = Math.max(0.5, (r.tenureMonths || 1) / 12);
    const ticketsPerTenureYear = +((r.supportTickets12m || 0) / yearsTenure).toFixed(2);
    const complaintRate = +((r.complaints12m || 0) / Math.max(1, r.supportTickets12m || 0)).toFixed(2);
    const slowResolutionFlag = (r.averageResolutionHours || 0) > resolution75th ? 1 : 0;
    const outageExposure = r.networkOutages12m || 0;
    const experienceIndex = +(outageExposure * 1.5 + (r.complaints12m || 0) * 2.0 + (slowResolutionFlag ? 1.0 : 0)).toFixed(1);

    // Sentiment
    const csat = r.satisfactionScore110 || 7;
    const satisfactionBand = csat <= 4 ? 'Low (1-4)' : csat <= 7 ? 'Medium (5-7)' : 'High (8-10)';
    
    let npsCategory: 'Detractor' | 'Passive' | 'Promoter' = 'Passive';
    if (r.npsScore > 40 || csat >= 9) npsCategory = 'Promoter';
    else if (r.npsScore <= 0 || csat <= 6) npsCategory = 'Detractor';

    const normalisedCsat = (csat - 1) / 9; // 0..1
    const normalisedNps = (Math.max(-100, Math.min(100, r.npsScore)) + 100) / 200; // 0..1
    const sentimentGap = +(normalisedCsat - normalisedNps).toFixed(2);

    // Competition
    const competitorOfferFlag = r.competitorOfferReceived === 'Yes' ? 1 : 0;
    const competitorOfferLowSat = competitorOfferFlag === 1 && csat <= 5 ? 1 : 0;

    // Lifecycle
    const tenure = r.tenureMonths || 0;
    let tenureBucket: '0-6m' | '7-12m' | '13-24m' | '25-48m' | '49m+' = '25-48m';
    if (tenure <= 6) tenureBucket = '0-6m';
    else if (tenure <= 12) tenureBucket = '7-12m';
    else if (tenure <= 24) tenureBucket = '13-24m';
    else if (tenure <= 48) tenureBucket = '25-48m';
    else tenureBucket = '49m+';

    return {
      id: r.id,
      churnFlag: r.churnFlag,
      churnStatus: r.churnStatus,
      monthlyChargeGbp: r.monthlyChargeGbp,
      usageToAllowanceRatio,
      overAllowanceFlag,
      overageToChargeRatio,
      chargePerGb,
      effectiveMonthlyCharge,
      discountFlag,
      highPriceFlag,
      monthsToContractEnd: monthsToEnd,
      contractExpiring30d,
      contractExpiring60d,
      contractExpiring90d,
      contractStage,
      autoRenewRiskFlag,
      paymentRiskIndex,
      nonDirectDebitFlag,
      ticketsPerTenureYear,
      complaintRate,
      slowResolutionFlag,
      outageExposure,
      experienceIndex,
      satisfactionBand,
      npsCategory,
      sentimentGap,
      competitorOfferFlag,
      competitorOfferLowSat,
      tenureBucket,
      ageBand: r.ageBand,
      customerSegment: r.customerSegment,
      serviceType: r.serviceType,
      ukNation: r.ukNation,
      contractType: r.contractType,
      paymentMethod: r.paymentMethod
    };
  });

  const vectorKeys = SAFE_MODEL_FEATURES.map(f => f.name);

  return { features, vectorKeys, medianChargeByService };
}

/**
 * Extracts numeric feature vector from engineered record and applies standardisation stats
 */
export function extractFeatureVector(
  feat: EngineeredCustomerFeatures,
  activeFeatures: string[],
  rawRecord?: CustomerRecord
): number[] {
  const vec: number[] = [];

  for (const name of activeFeatures) {
    switch (name) {
      case 'usageToAllowanceRatio': vec.push(feat.usageToAllowanceRatio); break;
      case 'overAllowanceFlag': vec.push(feat.overAllowanceFlag); break;
      case 'overageToChargeRatio': vec.push(feat.overageToChargeRatio); break;
      case 'chargePerGb': vec.push(feat.chargePerGb); break;
      case 'effectiveMonthlyCharge': vec.push(feat.effectiveMonthlyCharge); break;
      case 'discountFlag': vec.push(feat.discountFlag); break;
      case 'highPriceFlag': vec.push(feat.highPriceFlag); break;
      case 'monthsToContractEnd': vec.push(feat.monthsToContractEnd); break;
      case 'contractExpiring30d': vec.push(feat.contractExpiring30d); break;
      case 'contractExpiring60d': vec.push(feat.contractExpiring60d); break;
      case 'contractExpiring90d': vec.push(feat.contractExpiring90d); break;
      case 'autoRenewRiskFlag': vec.push(feat.autoRenewRiskFlag); break;
      case 'paymentRiskIndex': vec.push(feat.paymentRiskIndex); break;
      case 'nonDirectDebitFlag': vec.push(feat.nonDirectDebitFlag); break;
      case 'ticketsPerTenureYear': vec.push(feat.ticketsPerTenureYear); break;
      case 'complaintRate': vec.push(feat.complaintRate); break;
      case 'slowResolutionFlag': vec.push(feat.slowResolutionFlag); break;
      case 'outageExposure': vec.push(feat.outageExposure); break;
      case 'experienceIndex': vec.push(feat.experienceIndex); break;
      case 'satisfactionScore110': vec.push(rawRecord ? rawRecord.satisfactionScore110 : 7); break;
      case 'npsScore': vec.push(rawRecord ? rawRecord.npsScore : 20); break;
      case 'sentimentGap': vec.push(feat.sentimentGap); break;
      case 'competitorOfferFlag': vec.push(feat.competitorOfferFlag); break;
      case 'competitorOfferLowSat': vec.push(feat.competitorOfferLowSat); break;
      case 'tenureMonths': vec.push(rawRecord ? rawRecord.tenureMonths : 12); break;
      case 'age': vec.push(rawRecord ? rawRecord.age : 40); break;
      case 'isConsumer': vec.push(feat.customerSegment === 'Consumer' ? 1 : 0); break;
      case 'isRollingContract': vec.push(feat.contractType?.includes('Rolling') ? 1 : 0); break;
      default: vec.push(0); break;
    }
  }

  return vec;
}
