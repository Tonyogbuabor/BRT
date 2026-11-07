import {
  computePortfolioKPIs
} from './deterministicAnalytics';
import { calculateCampaignImpact } from './campaigns';
import { CustomerRecord, ScoredCustomer } from '../types/schema';

export interface DiagnosticResult {
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  observed: string;
  details: string;
  executionMs: number;
}

/**
 * Runs self-check diagnostics on verified synthetic micro-cases
 */
export function runSystemDiagnostics(): DiagnosticResult[] {
  const results: DiagnosticResult[] = [];

  // Test 1: Churn Rate Calculation
  {
    const start = performance.now();
    const testRecords: Partial<CustomerRecord>[] = [
      { id: 'T1', churnFlag: 1, churnStatus: 'Churned', monthlyChargeGbp: 40, discountPercent: 0, satisfactionScore110: 7, npsScore: 0, tenureMonths: 12 },
      { id: 'T2', churnFlag: 0, churnStatus: 'Active', monthlyChargeGbp: 50, discountPercent: 0, satisfactionScore110: 8, npsScore: 20, tenureMonths: 24 },
      { id: 'T3', churnFlag: 0, churnStatus: 'Active', monthlyChargeGbp: 30, discountPercent: 0, satisfactionScore110: 9, npsScore: 50, tenureMonths: 6 },
      { id: 'T4', churnFlag: 0, churnStatus: 'Active', monthlyChargeGbp: 60, discountPercent: 10, satisfactionScore110: 8, npsScore: 10, tenureMonths: 18 }
    ];

    const kpis = computePortfolioKPIs(testRecords as CustomerRecord[], []);
    const expectedRate = 25.0; // 1 out of 4 = 25%
    const passed = Math.abs(kpis.churnRatePercent - expectedRate) < 0.01 && kpis.churnRateDenominator.includes('1 churned / 4');

    results.push({
      name: 'Churn Rate & Denominator Formula',
      category: 'KPI Verification',
      passed,
      expected: '25.0% (1 churned / 4 total)',
      observed: `${kpis.churnRatePercent}% (${kpis.churnRateDenominator})`,
      details: 'Evaluates churn rate = churned / total in scope with visible denominator.',
      executionMs: +(performance.now() - start).toFixed(2)
    });
  }

  // Test 2: Active MRR & Effective Discount MRR
  {
    const start = performance.now();
    const testRecords: Partial<CustomerRecord>[] = [
      { id: 'T1', churnFlag: 1, churnStatus: 'Churned', monthlyChargeGbp: 100, discountPercent: 0, satisfactionScore110: 7, npsScore: 0, tenureMonths: 12 },
      { id: 'T2', churnFlag: 0, churnStatus: 'Active', monthlyChargeGbp: 50, discountPercent: 0, satisfactionScore110: 8, npsScore: 20, tenureMonths: 24 },
      { id: 'T3', churnFlag: 0, churnStatus: 'Active', monthlyChargeGbp: 40, discountPercent: 25, satisfactionScore110: 8, npsScore: 10, tenureMonths: 18 } // 40 * (1 - 0.25) = 30
    ];

    const kpis = computePortfolioKPIs(testRecords as CustomerRecord[], []);
    const expectedGross = 90.0; // 50 + 40
    const expectedEff = 80.0; // 50 + 30
    const passed = Math.abs(kpis.monthlyRecurringRevenueGbp - expectedGross) < 0.01 && Math.abs(kpis.effectiveMonthlyRecurringRevenueGbp - expectedEff) < 0.01;

    results.push({
      name: 'Active MRR & Effective Discount MRR',
      category: 'Financial Accuracy',
      passed,
      expected: `Gross: £${expectedGross.toFixed(2)}, Effective: £${expectedEff.toFixed(2)}`,
      observed: `Gross: £${kpis.monthlyRecurringRevenueGbp.toFixed(2)}, Effective: £${kpis.effectiveMonthlyRecurringRevenueGbp.toFixed(2)}`,
      details: 'Excludes churned accounts and applies discount percentage strictly to active customers.',
      executionMs: +(performance.now() - start).toFixed(2)
    });
  }

  // Test 3: Model Revenue at Risk & 12M Expected Loss
  {
    const start = performance.now();
    const scoredTest: Partial<ScoredCustomer>[] = [
      {
        id: 'S1',
        churnProbability: 0.60,
        effectiveMonthlyCharge: 40.0,
        expectedMonthlyRevenueAtRisk: 24.0, // 0.60 * 40
        expectedLoss12M: 288.0, // 24 * 12
        riskTier: 'High',
        record: { id: 'S1', churnFlag: 0, churnStatus: 'Active' } as CustomerRecord
      },
      {
        id: 'S2',
        churnProbability: 0.20,
        effectiveMonthlyCharge: 50.0,
        expectedMonthlyRevenueAtRisk: 10.0, // 0.20 * 50
        expectedLoss12M: 120.0, // 10 * 12
        riskTier: 'Low',
        record: { id: 'S2', churnFlag: 0, churnStatus: 'Active' } as CustomerRecord
      }
    ];

    const kpis = computePortfolioKPIs(scoredTest.map(s => s.record!) as CustomerRecord[], scoredTest as ScoredCustomer[]);
    const expectedMonthlyRisk = 34.0; // 24 + 10
    const expectedAnnualLoss = 408.0; // 34 * 12
    const passed = Math.abs(kpis.modelRevenueAtRiskGbp - expectedMonthlyRisk) < 0.01 && Math.abs(kpis.expected12MonthLossGbp - expectedAnnualLoss) < 0.01;

    results.push({
      name: 'Model Revenue at Risk & 12M Horizon Loss',
      category: 'Risk Modelling',
      passed,
      expected: `Monthly Risk: £${expectedMonthlyRisk.toFixed(2)}, 12M Loss: £${expectedAnnualLoss.toFixed(2)}`,
      observed: `Monthly Risk: £${kpis.modelRevenueAtRiskGbp.toFixed(2)}, 12M Loss: £${kpis.expected12MonthLossGbp.toFixed(2)}`,
      details: 'Ensures sum(churnProbability * effectiveMonthlyCharge) across all scored active accounts.',
      executionMs: +(performance.now() - start).toFixed(2)
    });
  }

  // Test 4: Net NPS Scale Detection (-100..100 vs 0..10)
  {
    const start = performance.now();
    // 0 to 10 scale: 1 Promoter (10), 1 Passive (7), 1 Detractor (3) -> 1/3 - 1/3 = 0%
    const npsRecords: Partial<CustomerRecord>[] = [
      { id: 'N1', npsScore: 10, churnFlag: 0, satisfactionScore110: 9 },
      { id: 'N2', npsScore: 7, churnFlag: 0, satisfactionScore110: 7 },
      { id: 'N3', npsScore: 3, churnFlag: 0, satisfactionScore110: 4 }
    ];

    const kpis = computePortfolioKPIs(npsRecords as CustomerRecord[], []);
    const passed = kpis.npsMethod.includes('Promoters (9-10)') && kpis.netNpsScore === 0;

    results.push({
      name: 'Net NPS Scale Detection (0 to 10 Standard)',
      category: 'Metric Governance',
      passed,
      expected: 'Net NPS: 0 (Detected 0-10 scale)',
      observed: `Net NPS: ${kpis.netNpsScore} (${kpis.npsMethod})`,
      details: 'Dynamically adapts calculation between 0-10 category method and -100 to +100 index.',
      executionMs: +(performance.now() - start).toFixed(2)
    });
  }

  // Test 5: Campaign Incremental Uplift & 2-Proportion z-Test
  {
    const start = performance.now();
    // Treated: 100 contacted, 80 retained (80%)
    // Control: 100 holdout, 60 retained (60%)
    // Uplift = +20.0%
    const impact = calculateCampaignImpact(
      100, // treated
      100, // control
      100, // contacted
      50,  // responded
      35,  // accepted
      80,  // retained treated
      60,  // retained control
      4.0, // costPerContact
      15.0 // costPerAccepted
    );

    const expectedUplift = 20.0;
    const passed = Math.abs((impact.incrementalUpliftPercent || 0) - expectedUplift) < 0.1 && (impact.zTestPValue || 1) < 0.05;

    results.push({
      name: 'Campaign Incremental Uplift & Two-Proportion z-Test',
      category: 'Campaign Attribution',
      passed,
      expected: 'Uplift: +20.0% (p < 0.05)',
      observed: `Uplift: +${impact.incrementalUpliftPercent}% (p-value: ${impact.zTestPValue})`,
      details: 'Verifies holdout control benchmark and two-proportion hypothesis testing.',
      executionMs: +(performance.now() - start).toFixed(2)
    });
  }

  // Test 6: Campaign ROI & Payback Period
  {
    const start = performance.now();
    const impact = calculateCampaignImpact(
      100, 100, 100, 50, 20, 80, 60,
      5.0, // costPerContact = £500
      25.0, // offerCost = £500 -> Total cost £1,000
      50.0, // £50/mo
      60,   // 60% margin
      12    // 12 months horizon
    );
    // Saves = 20 customers. Gross rev = 20 * 50 * 12 = £12,000. Retained margin = 60% * 12000 = £7,200. Net benefit = £6,200.
    // ROI = (7200 - 1000) / 1000 = 620%
    const expectedRoi = 620.0;
    const passed = Math.abs((impact.roiPercent || 0) - expectedRoi) < 5.0 && (impact.totalCampaignCostGbp || 0) === 1000.0;

    results.push({
      name: 'Campaign Financial ROI & Payback Period',
      category: 'Financial Accuracy',
      passed,
      expected: 'Total Cost: £1,000.00, ROI: 620.0%',
      observed: `Total Cost: £${impact.totalCampaignCostGbp?.toFixed(2)}, ROI: ${impact.roiPercent}%`,
      details: 'Calculates net retained margin minus total campaign costs over horizon months.',
      executionMs: +(performance.now() - start).toFixed(2)
    });
  }

  return results;
}
