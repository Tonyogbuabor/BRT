import { CustomerRecord } from '../types/schema';

// Seeded pseudorandom generator for deterministic, reproducible datasets
function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateSampleDataset(count = 1200, seed = 42): CustomerRecord[] {
  const rng = createPRNG(seed);

  const citiesByNation: Record<string, string[]> = {
    England: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Newcastle', 'Liverpool', 'Sheffield', 'Southampton', 'Nottingham'],
    Scotland: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness'],
    Wales: ['Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Bangor'],
    'Northern Ireland': ['Belfast', 'Derry', 'Lisburn', 'Newry', 'Bangor NI']
  };

  const nations = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
  const nationWeights = [0.78, 0.10, 0.07, 0.05];

  const channels = ['Online Direct', 'In-Store / Retail', 'Comparison Website', 'Telesales', 'Referral'];
  const services = [
    { type: 'Full Fibre Broadband', plans: ['BritFibre 150', 'BritFibre 500', 'Gigabit Ultra'], basePrice: 32 },
    { type: 'Standard Fibre Broadband', plans: ['Essential Fibre 35', 'Superfast 65'], basePrice: 24 },
    { type: 'Mobile 5G SIM Only', plans: ['BritMobile 15GB', 'BritMobile 50GB', 'BritMobile Unlimited'], basePrice: 16 },
    { type: 'Mobile + Handset', plans: ['BritMobile Plus 50GB', 'BritMobile Pro Unlimited'], basePrice: 52 },
    { type: 'Broadband + TV Bundle', plans: ['Entertainment Max Bundle', 'BritStream Fibre & TV'], basePrice: 48 },
    { type: 'Business Fibre Pro', plans: ['Business Connect 300', 'Business Prime Gigabit'], basePrice: 65 }
  ];

  const contractTypes = ['24 Months', '18 Months', '12 Months', '30-Day Rolling'];
  const churnReasons = [
    'Price Increase / Cost of Living',
    'Competitor Better Offer',
    'Repeated Network Outages',
    'Poor Support Resolution Time',
    'Moved Property Outside Service Area',
    'End of Fixed Contract Term'
  ];

  function pickWeighted<T>(items: T[], weights: number[]): T {
    const r = rng();
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      sum += weights[i];
      if (r <= sum) return items[i];
    }
    return items[items.length - 1];
  }

  const records: CustomerRecord[] = [];
  const refDate = new Date('2026-11-07');

  for (let i = 1; i <= count; i++) {
    const custId = `BC-${(10000 + i).toString()}`;
    const segment = rng() < 0.22 ? 'Small Business' : 'Consumer';
    const age = segment === 'Small Business' ? Math.floor(25 + rng() * 45) : Math.floor(18 + rng() * 65);
    
    let ageBand = '18-25';
    if (age > 65) ageBand = '65+';
    else if (age > 50) ageBand = '51-65';
    else if (age > 35) ageBand = '36-50';
    else if (age > 25) ageBand = '26-35';

    const genderRoll = rng();
    const gender = genderRoll < 0.48 ? 'Female' : genderRoll < 0.94 ? 'Male' : 'Non-Binary';

    const ukNation = pickWeighted(nations, nationWeights);
    const nationCities = citiesByNation[ukNation];
    const city = nationCities[Math.floor(rng() * nationCities.length)];

    const acquisitionChannel = channels[Math.floor(rng() * channels.length)];

    // Tenure between 2 and 72 months
    const tenureMonths = Math.floor(2 + rng() * 70);
    const joinDateTime = new Date(refDate.getTime() - tenureMonths * 30.4375 * 24 * 3600 * 1000);
    const joinDate = joinDateTime.toISOString().split('T')[0];

    // Service & Plan
    const serviceObj = segment === 'Small Business' && rng() < 0.6
      ? services[5] // Business Fibre
      : services[Math.floor(rng() * (services.length - 1))];
    const serviceType = serviceObj.type;
    const planName = serviceObj.plans[Math.floor(rng() * serviceObj.plans.length)];

    const contractType = serviceType.includes('Rolling') || rng() < 0.15
      ? '30-Day Rolling'
      : pickWeighted(contractTypes.slice(0, 3), [0.55, 0.25, 0.20]);

    // Contract dates
    const contractMonths = contractType === '24 Months' ? 24 : contractType === '18 Months' ? 18 : contractType === '12 Months' ? 12 : 1;
    // Current contract started either at joinDate or recently renewed
    const remainingTenureInContract = tenureMonths % contractMonths;
    const contractStartDateObj = new Date(refDate.getTime() - remainingTenureInContract * 30.4375 * 24 * 3600 * 1000);
    const contractStartDate = contractStartDateObj.toISOString().split('T')[0];
    
    const contractEndDateObj = new Date(contractStartDateObj.getTime() + contractMonths * 30.4375 * 24 * 3600 * 1000);
    const contractEndDate = contractEndDateObj.toISOString().split('T')[0];

    const autoRenew = rng() < 0.72 ? 'Yes' : 'No';

    // Pricing
    const basePrice = serviceObj.basePrice + (segment === 'Small Business' ? 18 : 0);
    const monthlyChargeGbp = +(basePrice + (rng() * 18 - 4)).toFixed(2);
    const discountPercent = rng() < 0.35 ? +((rng() * 30).toFixed(0)) : 0;

    // Usage & Allowance
    let dataAllowanceGb = 0; // unlimited
    if (serviceType.includes('Mobile') || rng() < 0.25) {
      dataAllowanceGb = pickWeighted([25, 50, 100, 250], [0.35, 0.35, 0.20, 0.10]);
    }
    const avgUsageBase = dataAllowanceGb > 0 ? dataAllowanceGb * (0.6 + rng() * 0.7) : 180 + rng() * 320;
    const averageMonthlyUsageGb = +avgUsageBase.toFixed(1);

    let overageChargesGbp = 0;
    if (dataAllowanceGb > 0 && averageMonthlyUsageGb > dataAllowanceGb) {
      overageChargesGbp = +((averageMonthlyUsageGb - dataAllowanceGb) * 1.5).toFixed(2);
    }

    // Payment
    const directDebit = rng() < 0.84 ? 'Yes' : 'No';
    const paymentMethod = directDebit === 'Yes'
      ? 'Direct Debit'
      : pickWeighted(['Debit Card', 'Credit Card', 'Bank Transfer'], [0.6, 0.3, 0.1]);

    const paymentRiskProb = directDebit === 'No' ? 0.35 : 0.08;
    const latePayments12m = rng() < paymentRiskProb ? Math.floor(1 + rng() * 4) : 0;
    const failedPayments12m = latePayments12m > 0 && rng() < 0.4 ? Math.floor(1 + rng() * 2) : 0;

    // Experience & Tickets
    const outages = pickWeighted([0, 1, 2, 3, 4], [0.65, 0.20, 0.09, 0.04, 0.02]);
    const tickets = Math.floor(rng() * 3 + outages * 0.8 + (rng() < 0.15 ? 3 : 0));
    const complaints = tickets > 1 && rng() < 0.3 ? Math.floor(1 + rng() * 2) : 0;
    const avgResolution = +(8 + complaints * 14 + rng() * 25).toFixed(1);

    // Satisfaction & NPS
    let csat = Math.round(7.5 - complaints * 1.5 - outages * 0.8 + (rng() * 3 - 1.5));
    if (csat > 10) csat = 10;
    if (csat < 1) csat = 1;

    // NPS score in -100 to 100 range (Net Promoter standard)
    let npsScore = Math.round((csat - 5.5) * 18 + (rng() * 20 - 10));
    if (npsScore > 100) npsScore = 100;
    if (npsScore < -100) npsScore = -100;

    const competitorOfferReceived = rng() < (csat < 6 ? 0.45 : 0.18) ? 'Yes' : 'No';

    // Churn probability calculation based on real causal risk factors
    const daysToExpiry = Math.round((contractEndDateObj.getTime() - refDate.getTime()) / (24 * 3600 * 1000));
    let churnScoreLogit = -2.2; // ~10% base rate
    if (contractType !== '30-Day Rolling' && daysToExpiry >= -30 && daysToExpiry <= 60) {
      churnScoreLogit += 1.4; // Contract cliff
      if (autoRenew === 'No') churnScoreLogit += 0.8;
    }
    if (complaints >= 2) churnScoreLogit += 1.3;
    if (avgResolution > 40) churnScoreLogit += 0.7;
    if (outages >= 2) churnScoreLogit += 0.9;
    if (csat <= 4) churnScoreLogit += 1.5;
    if (competitorOfferReceived === 'Yes') churnScoreLogit += 1.1;
    if (overageChargesGbp > 15) churnScoreLogit += 0.7;
    if (latePayments12m >= 2) churnScoreLogit += 0.8;
    if (tenureMonths <= 6) churnScoreLogit += 0.5;
    if (tenureMonths > 36) churnScoreLogit -= 0.6; // loyalty

    const prob = 1 / (1 + Math.exp(-churnScoreLogit));
    const isChurned = rng() < prob;

    const churnFlag: 0 | 1 = isChurned ? 1 : 0;
    const churnStatus = isChurned ? 'Churned' : 'Active';

    let churnDate = '';
    let churnReason = '';
    if (isChurned) {
      // Churned within the last 6 months
      const churnDaysAgo = Math.floor(5 + rng() * 160);
      const churnDateTime = new Date(refDate.getTime() - churnDaysAgo * 24 * 3600 * 1000);
      churnDate = churnDateTime.toISOString().split('T')[0];

      if (complaints > 0 || avgResolution > 40) {
        churnReason = 'Poor Support Resolution Time';
      } else if (outages >= 2) {
        churnReason = 'Repeated Network Outages';
      } else if (competitorOfferReceived === 'Yes') {
        churnReason = 'Competitor Better Offer';
      } else if (daysToExpiry <= 30) {
        churnReason = 'End of Fixed Contract Term';
      } else if (overageChargesGbp > 10 || monthlyChargeGbp > 45) {
        churnReason = 'Price Increase / Cost of Living';
      } else {
        churnReason = churnReasons[Math.floor(rng() * churnReasons.length)];
      }
    }

    const effectiveMonthly = monthlyChargeGbp * (1 - discountPercent / 100);
    const lifetimeRevenueGbp = +(tenureMonths * effectiveMonthly).toFixed(2);
    const monthlyRevenueAtRiskGbp = isChurned || prob > 0.45 ? +effectiveMonthly.toFixed(2) : 0;

    records.push({
      id: custId,
      customerSegment: segment,
      age,
      ageBand,
      gender,
      ukNation,
      city,
      acquisitionChannel,
      joinDate,
      tenureMonths,
      serviceType,
      planName,
      contractType,
      contractStartDate,
      contractEndDate,
      autoRenew,
      monthlyChargeGbp,
      averageMonthlyUsageGb,
      dataAllowanceGb,
      overageChargesGbp,
      discountPercent,
      paymentMethod,
      directDebit,
      latePayments12m,
      failedPayments12m,
      supportTickets12m: tickets,
      complaints12m: complaints,
      averageResolutionHours: avgResolution,
      networkOutages12m: outages,
      satisfactionScore110: csat,
      npsScore,
      competitorOfferReceived,
      churnStatus,
      churnDate,
      churnReason,
      lifetimeRevenueGbp,
      monthlyRevenueAtRiskGbp,
      churnFlag
    });
  }

  return records;
}
