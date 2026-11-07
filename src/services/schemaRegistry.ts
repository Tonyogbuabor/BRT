import { ColumnDefinition } from '../types/schema';

export const AUTHORITATIVE_COLUMNS: ColumnDefinition[] = [
  {
    index: 1,
    name: 'Customer ID',
    key: 'id',
    type: 'Text',
    description: 'Unique identifier assigned to each customer.',
    isIdentifier: true,
    requiredForTraining: true,
    aliases: ['customer id', 'customer_id', 'customerid', 'cust id', 'cust_id', 'id', 'account id', 'account_id', 'client id']
  },
  {
    index: 2,
    name: 'Customer Segment',
    key: 'customerSegment',
    type: 'Text',
    description: 'Customer classification (Consumer or Small Business).',
    allowedValues: ['Consumer', 'Small Business'],
    aliases: ['customer segment', 'customer_segment', 'segment', 'customer type', 'customertype', 'account type']
  },
  {
    index: 3,
    name: 'Age',
    key: 'age',
    type: 'Whole Number',
    description: 'Customer age in years.',
    minVal: 16,
    maxVal: 110,
    aliases: ['age', 'customer age', 'customer_age', 'age in years']
  },
  {
    index: 4,
    name: 'Age Band',
    key: 'ageBand',
    type: 'Text',
    description: 'Age grouping used for demographic analysis.',
    aliases: ['age band', 'age_band', 'age group', 'age_group', 'age bracket']
  },
  {
    index: 5,
    name: 'Gender',
    key: 'gender',
    type: 'Text',
    description: 'Recorded customer gender.',
    aliases: ['gender', 'sex']
  },
  {
    index: 6,
    name: 'UK Nation',
    key: 'ukNation',
    type: 'Text',
    description: 'UK constituent nation associated with the customer.',
    allowedValues: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    aliases: ['uk nation', 'uk_nation', 'nation', 'country', 'region', 'uk country', 'territory']
  },
  {
    index: 7,
    name: 'City',
    key: 'city',
    type: 'Text',
    description: 'Customer city.',
    aliases: ['city', 'town', 'location', 'municipality']
  },
  {
    index: 8,
    name: 'Acquisition Channel',
    key: 'acquisitionChannel',
    type: 'Text',
    description: 'Channel through which the customer was acquired.',
    aliases: ['acquisition channel', 'acquisition_channel', 'channel', 'source', 'acquisition source', 'signup channel']
  },
  {
    index: 9,
    name: 'Join Date',
    key: 'joinDate',
    type: 'Date',
    description: 'Date the customer first joined BritConnect.',
    aliases: ['join date', 'join_date', 'joined date', 'signup date', 'start date', 'registration date']
  },
  {
    index: 10,
    name: 'Tenure Months',
    key: 'tenureMonths',
    type: 'Whole Number',
    description: 'Length of customer relationship, in months.',
    minVal: 0,
    aliases: ['tenure months', 'tenure_months', 'tenure', 'months as customer', 'tenure (months)']
  },
  {
    index: 11,
    name: 'Service Type',
    key: 'serviceType',
    type: 'Text',
    description: 'Telecommunications service subscribed to.',
    aliases: ['service type', 'service_type', 'service', 'product type', 'line type', 'connection type']
  },
  {
    index: 12,
    name: 'Plan Name',
    key: 'planName',
    type: 'Text',
    description: 'Name of the subscription package.',
    aliases: ['plan name', 'plan_name', 'plan', 'package', 'tariff', 'tier']
  },
  {
    index: 13,
    name: 'Contract Type',
    key: 'contractType',
    type: 'Text',
    description: 'Contract arrangement or term.',
    aliases: ['contract type', 'contract_type', 'contract', 'term type', 'agreement type']
  },
  {
    index: 14,
    name: 'Contract Start Date',
    key: 'contractStartDate',
    type: 'Date',
    description: 'Date the current contract began.',
    aliases: ['contract start date', 'contract_start_date', 'contract start', 'agreement start']
  },
  {
    index: 15,
    name: 'Contract End Date',
    key: 'contractEndDate',
    type: 'Date',
    description: 'Scheduled contract expiry date, where applicable.',
    aliases: ['contract end date', 'contract_end_date', 'contract end', 'expiry date', 'renewal date']
  },
  {
    index: 16,
    name: 'Auto Renew',
    key: 'autoRenew',
    type: 'Text',
    description: 'Whether the contract renews automatically.',
    allowedValues: ['Yes', 'No'],
    aliases: ['auto renew', 'auto_renew', 'autorenew', 'auto-renew', 'automatic renewal']
  },
  {
    index: 17,
    name: 'Monthly Charge GBP',
    key: 'monthlyChargeGbp',
    type: 'Decimal Number',
    description: 'Monthly subscription charge in GBP (£).',
    minVal: 0,
    aliases: ['monthly charge gbp', 'monthly_charge_gbp', 'monthly charge', 'monthly bill', 'charge', 'monthly fee', 'mrr']
  },
  {
    index: 18,
    name: 'Average Monthly Usage GB',
    key: 'averageMonthlyUsageGb',
    type: 'Decimal Number',
    description: 'Average monthly data usage in gigabytes.',
    minVal: 0,
    aliases: ['average monthly usage gb', 'average_monthly_usage_gb', 'average monthly usage', 'monthly usage gb', 'usage gb', 'avg usage']
  },
  {
    index: 19,
    name: 'Data Allowance GB',
    key: 'dataAllowanceGb',
    type: 'Whole Number',
    description: 'Included monthly data allowance in gigabytes.',
    minVal: 0,
    aliases: ['data allowance gb', 'data_allowance_gb', 'data allowance', 'allowance gb', 'monthly allowance', 'cap gb']
  },
  {
    index: 20,
    name: 'Overage Charges GBP',
    key: 'overageChargesGbp',
    type: 'Decimal Number',
    description: 'Additional usage charges in GBP (£).',
    minVal: 0,
    aliases: ['overage charges gbp', 'overage_charges_gbp', 'overage charges', 'overage', 'extra charges', 'data overage']
  },
  {
    index: 21,
    name: 'Discount Percent',
    key: 'discountPercent',
    type: 'Decimal Number',
    description: 'Discount percentage applied to the subscription.',
    minVal: 0,
    maxVal: 100,
    aliases: ['discount percent', 'discount_percent', 'discount %', 'discount', 'promotional discount']
  },
  {
    index: 22,
    name: 'Payment Method',
    key: 'paymentMethod',
    type: 'Text',
    description: 'Customer payment method.',
    aliases: ['payment method', 'payment_method', 'pay method', 'billing method']
  },
  {
    index: 23,
    name: 'Direct Debit',
    key: 'directDebit',
    type: 'Text',
    description: 'Whether the customer pays by direct debit.',
    allowedValues: ['Yes', 'No'],
    aliases: ['direct debit', 'direct_debit', 'directdebit', 'dd active']
  },
  {
    index: 24,
    name: 'Late Payments 12M',
    key: 'latePayments12m',
    type: 'Whole Number',
    description: 'Number of late payments in the preceding 12 months.',
    minVal: 0,
    aliases: ['late payments 12m', 'late_payments_12m', 'late payments', 'late payments past year']
  },
  {
    index: 25,
    name: 'Failed Payments 12M',
    key: 'failedPayments12m',
    type: 'Whole Number',
    description: 'Number of failed payments in the preceding 12 months.',
    minVal: 0,
    aliases: ['failed payments 12m', 'failed_payments_12m', 'failed payments', 'bounced payments']
  },
  {
    index: 26,
    name: 'Support Tickets 12M',
    key: 'supportTickets12m',
    type: 'Whole Number',
    description: 'Number of support tickets in the preceding 12 months.',
    minVal: 0,
    aliases: ['support tickets 12m', 'support_tickets_12m', 'support tickets', 'tickets 12m', 'service tickets']
  },
  {
    index: 27,
    name: 'Complaints 12M',
    key: 'complaints12m',
    type: 'Whole Number',
    description: 'Number of complaints in the preceding 12 months.',
    minVal: 0,
    aliases: ['complaints 12m', 'complaints_12m', 'complaints', 'escalated complaints']
  },
  {
    index: 28,
    name: 'Average Resolution Hours',
    key: 'averageResolutionHours',
    type: 'Decimal Number',
    description: 'Average support issue resolution time in hours.',
    minVal: 0,
    aliases: ['average resolution hours', 'average_resolution_hours', 'avg resolution hours', 'resolution time hours', 'mean resolution time']
  },
  {
    index: 29,
    name: 'Network Outages 12M',
    key: 'networkOutages12m',
    type: 'Whole Number',
    description: 'Number of network outages in the preceding 12 months.',
    minVal: 0,
    aliases: ['network outages 12m', 'network_outages_12m', 'outages 12m', 'outages', 'service interruptions']
  },
  {
    index: 30,
    name: 'Satisfaction Score 1 10',
    key: 'satisfactionScore110',
    type: 'Whole Number',
    description: 'Customer satisfaction score on a scale from 1 to 10.',
    minVal: 1,
    maxVal: 10,
    aliases: ['satisfaction score 1 10', 'satisfaction_score_1_10', 'satisfaction score', 'csat', 'satisfaction score (1-10)', 'satisfaction']
  },
  {
    index: 31,
    name: 'NPS Score',
    key: 'npsScore',
    type: 'Whole Number',
    description: 'Customer advocacy score recorded in the dataset.',
    aliases: ['nps score', 'nps_score', 'nps', 'net promoter score']
  },
  {
    index: 32,
    name: 'Competitor Offer Received',
    key: 'competitorOfferReceived',
    type: 'Text',
    description: 'Whether the customer received an offer from a competitor.',
    allowedValues: ['Yes', 'No'],
    aliases: ['competitor offer received', 'competitor_offer_received', 'competitor offer', 'competitor_offer', 'rival offer']
  },
  {
    index: 33,
    name: 'Churn Status',
    key: 'churnStatus',
    type: 'Text',
    description: 'Recorded customer state: Active or Churned.',
    isTarget: true,
    allowedValues: ['Active', 'Churned'],
    aliases: ['churn status', 'churn_status', 'status', 'customer status', 'account status']
  },
  {
    index: 34,
    name: 'Churn Date',
    key: 'churnDate',
    type: 'Date',
    description: 'Cancellation/churn date; typically blank for active customers.',
    isPostChurnLeakage: true,
    aliases: ['churn date', 'churn_date', 'cancellation date', 'termination date', 'churned date']
  },
  {
    index: 35,
    name: 'Churn Reason',
    key: 'churnReason',
    type: 'Text',
    description: 'Reason for cancellation; typically blank for active customers.',
    isPostChurnLeakage: true,
    aliases: ['churn reason', 'churn_reason', 'cancellation reason', 'reason for leaving', 'churn category']
  },
  {
    index: 36,
    name: 'Lifetime Revenue GBP',
    key: 'lifetimeRevenueGbp',
    type: 'Decimal Number',
    description: 'Cumulative recorded revenue from the customer in GBP (£).',
    minVal: 0,
    aliases: ['lifetime revenue gbp', 'lifetime_revenue_gbp', 'lifetime revenue', 'clv', 'ltv', 'total revenue']
  },
  {
    index: 37,
    name: 'Monthly Revenue At Risk GBP',
    key: 'monthlyRevenueAtRiskGbp',
    type: 'Decimal Number',
    description: 'Estimated monthly revenue exposed to churn in GBP (£).',
    isPostChurnLeakage: true,
    minVal: 0,
    aliases: ['monthly revenue at risk gbp', 'monthly_revenue_at_risk_gbp', 'revenue at risk', 'monthly revenue at risk']
  },
  {
    index: 38,
    name: 'Churn Flag',
    key: 'churnFlag',
    type: 'Whole Number',
    description: 'Binary churn outcome: 1 = Churned, 0 = Active.',
    isTarget: true,
    requiredForTraining: true,
    minVal: 0,
    maxVal: 1,
    aliases: ['churn flag', 'churn_flag', 'churned', 'is_churn', 'churn label', 'target']
  }
];

/**
 * Normalises header string for fuzzy matching:
 * - strips UTF-8 BOM
 * - lowercases
 * - strips underscores, hyphens, parentheses, brackets, colons, dots
 * - collapses multiple whitespaces
 */
export function normaliseHeader(header: string): string {
  if (!header) return '';
  return header
    .replace(/^\uFEFF/, '') // Strip UTF-8 BOM
    .toLowerCase()
    .replace(/[_\-\(\)\[\]:.,%£]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match a raw CSV/Excel column name against our schema registry
 */
export function matchColumn(rawHeader: string): { col: ColumnDefinition | null; confidence: number } {
  const norm = normaliseHeader(rawHeader);
  if (!norm) return { col: null, confidence: 0 };

  // 1. Exact match on clean name
  for (const col of AUTHORITATIVE_COLUMNS) {
    if (normaliseHeader(col.name) === norm || col.key.toLowerCase() === norm) {
      return { col, confidence: 1.0 };
    }
  }

  // 2. Exact match in aliases
  for (const col of AUTHORITATIVE_COLUMNS) {
    for (const alias of col.aliases) {
      if (normaliseHeader(alias) === norm) {
        return { col, confidence: 0.95 };
      }
    }
  }

  // 3. Partial / substring match
  for (const col of AUTHORITATIVE_COLUMNS) {
    for (const alias of col.aliases) {
      const aliasNorm = normaliseHeader(alias);
      if (norm.includes(aliasNorm) || aliasNorm.includes(norm)) {
        return { col, confidence: 0.75 };
      }
    }
  }

  return { col: null, confidence: 0 };
}
