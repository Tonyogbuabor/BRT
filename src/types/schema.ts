/**
 * BritConnect AI Customer Churn Intelligence Platform
 * Authoritative Schema & Data Types (38 Columns + Engineered Features)
 */

export type DataType = 'Text' | 'Whole Number' | 'Decimal Number' | 'Date';

export interface ColumnDefinition {
  index: number;
  name: string;
  key: string; // camelCase internal key
  type: DataType;
  description: string;
  requiredForTraining?: boolean;
  isIdentifier?: boolean;
  isTarget?: boolean;
  isPostChurnLeakage?: boolean;
  allowedValues?: string[];
  minVal?: number;
  maxVal?: number;
  aliases: string[];
}

export type RiskTier = 'Critical' | 'High' | 'Medium' | 'Low';

export interface CustomerRecord {
  id: string; // Customer ID
  customerSegment: 'Consumer' | 'Small Business' | string;
  age: number;
  ageBand: string;
  gender: string;
  ukNation: 'England' | 'Scotland' | 'Wales' | 'Northern Ireland' | string;
  city: string;
  acquisitionChannel: string;
  joinDate: string; // ISO date YYYY-MM-DD
  tenureMonths: number;
  serviceType: string;
  planName: string;
  contractType: string;
  contractStartDate: string;
  contractEndDate: string;
  autoRenew: 'Yes' | 'No' | string;
  monthlyChargeGbp: number;
  averageMonthlyUsageGb: number;
  dataAllowanceGb: number;
  overageChargesGbp: number;
  discountPercent: number;
  paymentMethod: string;
  directDebit: 'Yes' | 'No' | string;
  latePayments12m: number;
  failedPayments12m: number;
  supportTickets12m: number;
  complaints12m: number;
  averageResolutionHours: number;
  networkOutages12m: number;
  satisfactionScore110: number; // 1-10
  npsScore: number;
  competitorOfferReceived: 'Yes' | 'No' | string;
  churnStatus: 'Active' | 'Churned' | string;
  churnDate?: string;
  churnReason?: string;
  lifetimeRevenueGbp: number;
  monthlyRevenueAtRiskGbp: number;
  churnFlag: 0 | 1; // 1 = Churned, 0 = Active
  
  // Dynamic fields if extra columns provided
  [key: string]: any;
}

export interface EngineeredCustomerFeatures {
  id: string;
  // Raw base reference
  churnFlag: 0 | 1;
  churnStatus: string;
  monthlyChargeGbp: number;
  
  // Usage features
  usageToAllowanceRatio: number;
  overAllowanceFlag: 0 | 1;
  overageToChargeRatio: number;
  chargePerGb: number;
  
  // Value & Pricing
  effectiveMonthlyCharge: number;
  discountFlag: 0 | 1;
  highPriceFlag: 0 | 1;
  
  // Contract
  monthsToContractEnd: number;
  contractExpiring30d: 0 | 1;
  contractExpiring60d: 0 | 1;
  contractExpiring90d: 0 | 1;
  contractStage: 'In-Term' | 'Renewal Window' | 'Out-of-Contract';
  autoRenewRiskFlag: 0 | 1; // Expiring with AutoRenew = No
  
  // Payment risk
  paymentRiskIndex: number;
  nonDirectDebitFlag: 0 | 1;
  
  // Service experience
  ticketsPerTenureYear: number;
  complaintRate: number; // complaints / max(1, tickets)
  slowResolutionFlag: 0 | 1;
  outageExposure: number;
  experienceIndex: number; // Combined penalty
  
  // Sentiment
  satisfactionBand: 'Low (1-4)' | 'Medium (5-7)' | 'High (8-10)';
  npsCategory: 'Detractor' | 'Passive' | 'Promoter';
  sentimentGap: number; // normalised difference
  
  // Competition
  competitorOfferFlag: 0 | 1;
  competitorOfferLowSat: 0 | 1;
  
  // Lifecycle
  tenureBucket: '0-6m' | '7-12m' | '13-24m' | '25-48m' | '49m+';
  ageBand: string;
  customerSegment: string;
  serviceType: string;
  ukNation: string;
  contractType: string;
  paymentMethod: string;
}

export interface ValidationIssue {
  severity: 'Error' | 'Warning' | 'Info';
  category: string;
  column?: string;
  message: string;
  affectedRows: number;
  sampleIds: string[];
}

export interface ColumnMissingness {
  column: string;
  missingCount: number;
  missingPercent: number;
  detectedType: string;
}

export interface ValidationReport {
  timestamp: string;
  totalRows: number;
  totalColumns: number;
  mappedColumnsCount: number;
  unmappedColumns: string[];
  qualityScore: number; // 0-100
  issues: ValidationIssue[];
  missingness: ColumnMissingness[];
  duplicateIdCount: number;
  duplicateSampleIds: string[];
  targetBalance: {
    activeCount: number;
    churnedCount: number;
    churnRate: number;
    hasTarget: boolean;
  };
  detectedNpsScale: '-100 to 100' | '0 to 10' | 'Other';
  dateSanity: {
    validDatesCount: number;
    inconsistentDateCount: number;
  };
}

export interface CleaningLogEntry {
  id: string;
  step: string;
  description: string;
  rowsAffected: number;
  beforeSample?: string;
  afterSample?: string;
  applied: boolean;
}

export interface ScoredDriver {
  featureName: string;
  label: string;
  impactPoints: number; // e.g. +14 or -6 pts
  direction: 'increases_risk' | 'decreases_risk';
  plainEnglish: string;
  rawValue: string | number;
}

export interface ScoredCustomer {
  id: string;
  churnProbability: number; // 0.0 - 1.0 (calibrated)
  riskTier: RiskTier;
  riskPercentile: number; // 1 - 100
  effectiveMonthlyCharge: number;
  expectedMonthlyRevenueAtRisk: number; // churnProbability * effectiveMonthlyCharge
  expectedLoss12M: number; // churnProbability * effectiveMonthlyCharge * 12
  topDrivers: ScoredDriver[];
  waterfallBaseline: number; // Base rate probability
  record: CustomerRecord;
}

export interface ConfusionMatrix {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
}

export interface CurvePoint {
  x: number;
  y: number;
  threshold?: number;
}

export interface ModelMetrics {
  rocAuc: number;
  prAuc: number;
  accuracy: number;
  balancedAccuracy: number;
  precision: number;
  recall: number;
  f1: number;
  specificity: number;
  brierScore: number;
  logLoss: number;
  matthewsCorrelation: number;
  ksStatistic: number;
  topDecileLift: number;
  gini: number;
  cvMeanPrAuc: number;
  cvStdPrAuc: number;
  cvMeanRocAuc: number;
  cvStdRocAuc: number;
  rocCurve: CurvePoint[];
  prCurve: CurvePoint[];
  calibrationCurve: { meanPredicted: number; observedFrequency: number }[];
  liftCurve: { decile: number; cumulativeLift: number; percentageOfBase: number }[];
  scoreDistribution: { bin: string; activeCount: number; churnedCount: number }[];
  confusionMatrix: ConfusionMatrix;
}

export type MLAlgorithm = 'Logistic Regression' | 'Decision Tree' | 'Random Forest' | 'Gradient Boosted Trees';

export interface ModelCard {
  id: string;
  algorithm: MLAlgorithm;
  trainedAt: string;
  dataVersion: string;
  rowCount: number;
  activeFeatures: string[];
  excludedFeatures: { feature: string; reason: string }[];
  hyperparameters: Record<string, any>;
  metrics: ModelMetrics;
  optimalThreshold: number;
  fairnessAudit: {
    bySegment: Record<string, { count: number; churnRate: number; testPrAuc: number }>;
    byGender: Record<string, { count: number; churnRate: number; testPrAuc: number }>;
    byNation: Record<string, { count: number; churnRate: number; testPrAuc: number }>;
    byAgeBand: Record<string, { count: number; churnRate: number; testPrAuc: number }>;
  };
  driftMetrics?: Record<string, { psi: number; status: 'Stable' | 'Moderate Drift' | 'Significant Drift' }>;
  isChampion: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  targetTier: RiskTier | 'All High/Critical' | 'Custom Cohort';
  targetSegment?: string;
  offerType: string; // e.g. "Proactive Service Call", "Tailored Loyalty Discount", "Data Allowance Upgrade", "Free Device Upgrade"
  channel: 'Call' | 'Email' | 'SMS' | 'App Notification' | 'Direct Mail';
  startDate: string;
  endDate: string;
  budgetGbp: number;
  costPerContactGbp: number;
  offerCostPerAcceptedGbp: number;
  owner: string;
  status: 'Planned' | 'Active' | 'Completed';
  holdoutPercent: number; // 10% - 20%
  
  // Results (when uploaded or tracked)
  resultsLoaded: boolean;
  treatedCount: number;
  controlCount: number;
  contactedCount: number;
  respondedCount: number;
  acceptedCount: number;
  retainedTreatedCount: number;
  retainedControlCount: number;
  
  // Evaluated Uplift & ROI
  retentionRateTreated: number;
  retentionRateControl: number;
  incrementalUpliftPercent: number; // retentionTreated - retentionControl
  zTestPValue: number;
  ci95Low: number;
  ci95High: number;
  incrementalSaves: number;
  revenueRetainedGbp: number;
  totalCampaignCostGbp: number;
  netBenefitGbp: number;
  roiPercent: number;
  costPerSaveGbp: number;
  paybackPeriodMonths: number;
  notes?: string;
}

export interface FilterState {
  searchQuery: string;
  customerSegment: string;
  serviceType: string;
  planName: string;
  ukNation: string;
  city: string;
  acquisitionChannel: string;
  contractType: string;
  ageBand: string;
  gender: string;
  riskTier: string;
  joinDateFrom: string;
  joinDateTo: string;
}

export interface BusinessAssumptions {
  costPerContactGbp: number; // default £4.50
  saveRatePercent: number; // default 28%
  averageMarginPercent: number; // default 65%
  horizonMonths: number; // default 12
  criticalRiskThreshold: number; // default 0.70
  highRiskThreshold: number; // default 0.50
  mediumRiskThreshold: number; // default 0.30
  referenceDate: string; // default 2026-11-07
}

export interface DatasetVersion {
  id: string;
  timestamp: string;
  fileName: string;
  action: 'Initial Upload' | 'Append / Merge' | 'Full Replace' | 'Score-Only Batch';
  rowCount: number;
  activeCount: number;
  churnedCount: number;
  qualityScore: number;
}
