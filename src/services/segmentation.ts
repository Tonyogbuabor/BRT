import { ScoredCustomer } from '../types/schema';

export interface CustomerSegmentSummary {
  id: string;
  name: string;
  lens: 'Rule-Based' | 'K-Means Cluster';
  customerCount: number;
  percentageOfBase: number;
  churnRatePercent: number;
  averageProbabilityPercent: number;
  monthlyRecurringRevenueGbp: number;
  monthlyRevenueAtRiskGbp: number;
  averageTenureMonths: number;
  definingTraits: string[];
  recommendedStrategy: string;
  customerIds: string[];
}

/**
 * Generates rule-based business segments
 */
export function buildRuleBasedSegments(scoredList: ScoredCustomer[]): CustomerSegmentSummary[] {
  if (scoredList.length === 0) return [];

  const total = scoredList.length;
  const totalMrr = scoredList.reduce((acc, c) => acc + c.effectiveMonthlyCharge, 0);

  // Calculate charge percentiles
  const charges = scoredList.map(c => c.effectiveMonthlyCharge).sort((a, b) => a - b);
  const p75Charge = charges[Math.floor(charges.length * 0.75)] || 45;
  const medianCharge = charges[Math.floor(charges.length * 0.50)] || 32;

  const segmentBuckets: Record<string, ScoredCustomer[]> = {
    'High Value – High Risk': [],
    'High Value – Stable': [],
    'Contract Cliff Window': [],
    'Service Frustrated': [],
    'Price & Competitor Vulnerable': [],
    'Payment Friction': [],
    'Loyal Brand Advocates': [],
    'Core Consumer Base': []
  };

  for (const c of scoredList) {
    const r = c.record;
    const isHighRisk = c.riskTier === 'Critical' || c.riskTier === 'High';
    const isHighValue = c.effectiveMonthlyCharge >= p75Charge;
    const csat = r.satisfactionScore110 || 7;
    const outages = r.networkOutages12m || 0;
    const complaints = r.complaints12m || 0;
    const daysToEnd = Math.round((new Date(r.contractEndDate || '2026-11-07').getTime() - new Date('2026-11-07').getTime()) / (24 * 3600 * 1000));

    if (isHighValue && isHighRisk) {
      segmentBuckets['High Value – High Risk'].push(c);
    } else if (isHighValue && !isHighRisk) {
      segmentBuckets['High Value – Stable'].push(c);
    } else if (daysToEnd >= -15 && daysToEnd <= 60 && !r.contractType.includes('Rolling')) {
      segmentBuckets['Contract Cliff Window'].push(c);
    } else if (complaints >= 2 || outages >= 2 || csat <= 4) {
      segmentBuckets['Service Frustrated'].push(c);
    } else if (r.competitorOfferReceived === 'Yes' || (r.overageChargesGbp || 0) > 10) {
      segmentBuckets['Price & Competitor Vulnerable'].push(c);
    } else if (r.directDebit !== 'Yes' || (r.latePayments12m || 0) >= 1) {
      segmentBuckets['Payment Friction'].push(c);
    } else if ((r.tenureMonths || 0) > 30 && csat >= 8) {
      segmentBuckets['Loyal Brand Advocates'].push(c);
    } else {
      segmentBuckets['Core Consumer Base'].push(c);
    }
  }

  const segmentDefinitions: Record<string, { traits: string[]; strategy: string }> = {
    'High Value – High Risk': {
      traits: ['Premium monthly spend (> £45/mo)', 'Critical or High churn probability', 'Severe revenue exposure'],
      strategy: 'Immediate executive account manager outreach with bespoke VIP renewal and device credit.'
    },
    'High Value – Stable': {
      traits: ['High monthly spend', 'Low/Medium churn risk', 'Advocate sentiment or long contract term'],
      strategy: 'Nurture with loyalty perks, exclusive early-access features, and priority network routing.'
    },
    'Contract Cliff Window': {
      traits: ['Contract expiry scheduled within 60 days', 'Non-rolling fixed term', 'Heightened shopping activity'],
      strategy: 'Proactive renewal campaign (T-45 days) offering speed upgrade or price-lock guarantee.'
    },
    'Service Frustrated': {
      traits: ['Multiple complaints logged', 'Network outages experienced', 'CSAT score ≤ 4/10'],
      strategy: 'Service recovery call from dedicated technical team plus goodwill billing credit.'
    },
    'Price & Competitor Vulnerable': {
      traits: ['Received competitor switch offer', 'Experiencing overage penalty fees', 'High price sensitivity'],
      strategy: 'Plan rightsizing, overage waiver, or targeted price-match retention offer.'
    },
    'Payment Friction': {
      traits: ['Manual payment method (non-DD)', 'History of late or bounced payments', 'Billing friction'],
      strategy: 'Direct Debit incentive (£2.50/mo bill discount) with flexible pay-day date alignment.'
    },
    'Loyal Brand Advocates': {
      traits: ['Tenure > 30 months', 'CSAT 8-10 / High NPS', 'Stable payment history'],
      strategy: 'Referral advocacy incentive, family add-on bundles, and long-tenure appreciation.'
    },
    'Core Consumer Base': {
      traits: ['Average usage & allowance', 'Standard 18M contract', 'Low friction'],
      strategy: 'Standard engagement newsletter, digital self-service tools, and periodic satisfaction pulse.'
    }
  };

  const results: CustomerSegmentSummary[] = [];

  for (const [name, members] of Object.entries(segmentBuckets)) {
    if (members.length === 0) continue;
    const count = members.length;
    const mrr = members.reduce((acc, c) => acc + c.effectiveMonthlyCharge, 0);
    const riskMrr = members.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0);
    const avgProb = members.reduce((acc, c) => acc + c.churnProbability, 0) / count;
    const churnedCount = members.filter(c => c.record.churnFlag === 1).length;
    const avgTenure = members.reduce((acc, c) => acc + (c.record.tenureMonths || 0), 0) / count;

    results.push({
      id: `seg_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name,
      lens: 'Rule-Based',
      customerCount: count,
      percentageOfBase: +((count / total) * 100).toFixed(1),
      churnRatePercent: +((churnedCount / count) * 100).toFixed(1),
      averageProbabilityPercent: +(avgProb * 100).toFixed(1),
      monthlyRecurringRevenueGbp: +mrr.toFixed(2),
      monthlyRevenueAtRiskGbp: +riskMrr.toFixed(2),
      averageTenureMonths: +avgTenure.toFixed(1),
      definingTraits: segmentDefinitions[name]?.traits || [],
      recommendedStrategy: segmentDefinitions[name]?.strategy || 'Targeted proactive engagement.',
      customerIds: members.map(c => c.id)
    });
  }

  return results;
}

/**
 * Fast K-Means Clustering on customer profiles
 */
export function buildKMeansSegments(scoredList: ScoredCustomer[], k = 4): CustomerSegmentSummary[] {
  if (scoredList.length < k * 3) return [];

  // Extract normalised features for clustering
  const data = scoredList.map(c => [
    c.churnProbability,
    Math.min(1.0, c.effectiveMonthlyCharge / 100),
    Math.min(1.0, (c.record.tenureMonths || 0) / 72),
    Math.min(1.0, (c.record.complaints12m || 0) / 4),
    (c.record.satisfactionScore110 || 7) / 10
  ]);

  // Initial centroids using k-means++ style
  const centroids: number[][] = [data[0]];
  for (let c = 1; c < k; c++) {
    const idx = Math.floor((c * data.length) / k);
    centroids.push(data[idx]);
  }

  // Iterate 10 passes
  let clusterAssignments = new Array(data.length).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    // Assignment
    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        let dist = 0;
        for (let j = 0; j < data[i].length; j++) {
          dist += Math.pow(data[i][j] - centroids[c][j], 2);
        }
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      clusterAssignments[i] = bestCluster;
    }

    // Update centroids
    for (let c = 0; c < k; c++) {
      const assigned = data.filter((_, i) => clusterAssignments[i] === c);
      if (assigned.length > 0) {
        for (let j = 0; j < data[0].length; j++) {
          centroids[c][j] = assigned.reduce((acc, row) => acc + row[j], 0) / assigned.length;
        }
      }
    }
  }

  const clusters: CustomerSegmentSummary[] = [];
  const total = scoredList.length;

  for (let c = 0; c < k; c++) {
    const members = scoredList.filter((_, i) => clusterAssignments[i] === c);
    if (members.length === 0) continue;

    const count = members.length;
    const mrr = members.reduce((acc, item) => acc + item.effectiveMonthlyCharge, 0);
    const riskMrr = members.reduce((acc, item) => acc + item.expectedMonthlyRevenueAtRisk, 0);
    const avgProb = members.reduce((acc, item) => acc + item.churnProbability, 0) / count;
    const avgTenure = members.reduce((acc, item) => acc + (item.record.tenureMonths || 0), 0) / count;
    const avgCsat = members.reduce((acc, item) => acc + (item.record.satisfactionScore110 || 7), 0) / count;

    let clusterName = `Cohort ${c + 1}`;
    let strategy = 'Segment targeted communications.';
    const traits: string[] = [];

    if (avgProb > 0.45) {
      clusterName = `Cluster ${c + 1}: Elevated Churn Risk (${(avgProb * 100).toFixed(0)}%)`;
      traits.push(`High churn risk (${(avgProb * 100).toFixed(0)}%)`);
      strategy = 'Priority retention outreach and contract renewal save desks.';
    } else if (mrr / count > 42) {
      clusterName = `Cluster ${c + 1}: Premium High-Value Accounts`;
      traits.push(`Above average monthly revenue (£${(mrr / count).toFixed(2)})`);
      strategy = 'VIP relationship management and proactive account reviews.';
    } else if (avgTenure > 30) {
      clusterName = `Cluster ${c + 1}: Mature Loyal Base`;
      traits.push(`High customer tenure (${avgTenure.toFixed(0)} months)`);
      strategy = 'Cross-sell and loyalty appreciation incentives.';
    } else {
      clusterName = `Cluster ${c + 1}: Standard Usage Cohort`;
      traits.push(`Moderate risk and standard product distribution`);
      strategy = 'Digital self-service engagement and quarterly NPS check.';
    }

    traits.push(`Avg CSAT: ${avgCsat.toFixed(1)}/10`);
    traits.push(`Avg Monthly Bill: £${(mrr / count).toFixed(2)}`);

    clusters.push({
      id: `kmeans_cluster_${c + 1}`,
      name: clusterName,
      lens: 'K-Means Cluster',
      customerCount: count,
      percentageOfBase: +((count / total) * 100).toFixed(1),
      churnRatePercent: +(avgProb * 100).toFixed(1),
      averageProbabilityPercent: +(avgProb * 100).toFixed(1),
      monthlyRecurringRevenueGbp: +mrr.toFixed(2),
      monthlyRevenueAtRiskGbp: +riskMrr.toFixed(2),
      averageTenureMonths: +avgTenure.toFixed(1),
      definingTraits: traits,
      recommendedStrategy: strategy,
      customerIds: members.map(m => m.id)
    });
  }

  return clusters;
}
