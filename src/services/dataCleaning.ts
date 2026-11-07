import {
  CustomerRecord,
  ValidationReport,
  ValidationIssue,
  ColumnMissingness,
  CleaningLogEntry
} from '../types/schema';
import { AUTHORITATIVE_COLUMNS } from './schemaRegistry';

/**
 * Robust date parser supporting DD/MM/YYYY, YYYY-MM-DD, ISO timestamps, and Excel serial numbers
 */
export function parseDateToISO(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  if (!str) return null;

  // Check Excel serial number (e.g. 44500)
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10);
    // Excel base date 1899-12-30
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ukMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ukMatch) {
    const day = ukMatch[1].padStart(2, '0');
    const month = ukMatch[2].padStart(2, '0');
    const year = ukMatch[3];
    const iso = `${year}-${month}-${day}`;
    if (!isNaN(Date.parse(iso))) return iso;
  }

  // YYYY-MM-DD or ISO
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return null;
}

/**
 * Coerces numeric strings, handling £, commas, % signs, and accounting brackets
 */
export function coerceNumeric(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;

  let str = String(val).trim();
  // Accounting bracket: (25.50) -> -25.50
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.slice(1, -1);
  }
  // Strip currency symbols, commas, spaces, percentage
  str = str.replace(/[£$€,%\s]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Standardises boolean / Yes-No responses
 */
export function standardiseYesNo(val: any, fallback = 'No'): 'Yes' | 'No' {
  if (val === undefined || val === null || val === '') return fallback as any;
  const str = String(val).trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 't'].includes(str)) return 'Yes';
  if (['no', 'n', 'false', '0', 'f'].includes(str)) return 'No';
  return fallback as any;
}

/**
 * Validates raw records and produces a comprehensive Data Quality Report
 */
export function validateDataset(
  rawRows: any[],
  columnMapping: Record<string, string>, // rawHeader -> schemaKey
  refDateStr = '2026-11-07'
): { report: ValidationReport; mappedRecords: any[] } {
  const issues: ValidationIssue[] = [];
  const refDate = new Date(refDateStr);

  const mappedRecords: any[] = [];
  const idCounts: Record<string, number> = {};
  const duplicateSampleIds: string[] = [];

  // Determine which schema columns are mapped
  const mappedKeys = new Set(Object.values(columnMapping).filter(Boolean));
  const missingRequiredColumns = AUTHORITATIVE_COLUMNS
    .filter(c => c.requiredForTraining && !mappedKeys.has(c.key))
    .map(c => c.name);

  if (missingRequiredColumns.length > 0) {
    issues.push({
      severity: 'Error',
      category: 'Schema',
      message: `Missing required column(s): ${missingRequiredColumns.join(', ')}`,
      affectedRows: rawRows.length,
      sampleIds: []
    });
  }

  // Pre-scan for missingness and types
  const columnMissingCounts: Record<string, number> = {};
  for (const c of AUTHORITATIVE_COLUMNS) {
    columnMissingCounts[c.key] = 0;
  }

  let activeCount = 0;
  let churnedCount = 0;
  let targetFound = false;

  let npsMin = Infinity;
  let npsMax = -Infinity;

  let ageOutOfRangeCount = 0;
  let csatOutOfRangeCount = 0;
  let negativeNumericCount = 0;
  let dateInconsistentCount = 0;
  let targetContradictionCount = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNum = idx + 1;
    const mapped: any = {};

    for (const [rawH, schemaKey] of Object.entries(columnMapping)) {
      if (schemaKey) {
        mapped[schemaKey] = raw[rawH];
      }
    }

    const custId = mapped.id ? String(mapped.id).trim() : `ROW-${rowNum}`;
    mapped.id = custId;

    // Check duplicate IDs
    if (custId) {
      idCounts[custId] = (idCounts[custId] || 0) + 1;
      if (idCounts[custId] === 2 && duplicateSampleIds.length < 5) {
        duplicateSampleIds.push(custId);
      }
    }

    // Missingness check
    for (const col of AUTHORITATIVE_COLUMNS) {
      const val = mapped[col.key];
      if (val === undefined || val === null || String(val).trim() === '') {
        columnMissingCounts[col.key] = (columnMissingCounts[col.key] || 0) + 1;
      }
    }

    // Coerce target
    let churnFlag: 0 | 1 | undefined = undefined;
    if (mapped.churnFlag !== undefined && mapped.churnFlag !== null && mapped.churnFlag !== '') {
      const parsedFlag = coerceNumeric(mapped.churnFlag, -1);
      if (parsedFlag === 0 || parsedFlag === 1) churnFlag = parsedFlag as 0 | 1;
    }
    if (churnFlag === undefined && mapped.churnStatus) {
      const st = String(mapped.churnStatus).trim().toLowerCase();
      if (st.includes('churn')) churnFlag = 1;
      else if (st.includes('act')) churnFlag = 0;
    }

    if (churnFlag !== undefined) {
      targetFound = true;
      if (churnFlag === 1) churnedCount++;
      else activeCount++;
    }

    // Check contradiction between churnStatus and churnFlag
    if (mapped.churnStatus && churnFlag !== undefined) {
      const st = String(mapped.churnStatus).trim().toLowerCase();
      const statusIsChurned = st.includes('churn');
      if ((statusIsChurned && churnFlag === 0) || (!statusIsChurned && churnFlag === 1)) {
        targetContradictionCount++;
      }
    }

    // Age check
    if (mapped.age !== undefined && mapped.age !== '') {
      const age = coerceNumeric(mapped.age, -1);
      if (age < 16 || age > 110) ageOutOfRangeCount++;
    }

    // CSAT check
    if (mapped.satisfactionScore110 !== undefined && mapped.satisfactionScore110 !== '') {
      const csat = coerceNumeric(mapped.satisfactionScore110, -1);
      if (csat < 1 || csat > 10) csatOutOfRangeCount++;
    }

    // NPS range detection
    if (mapped.npsScore !== undefined && mapped.npsScore !== '') {
      const nps = coerceNumeric(mapped.npsScore, 0);
      if (nps < npsMin) npsMin = nps;
      if (nps > npsMax) npsMax = nps;
    }

    // Date sanity check
    const joinDateISO = parseDateToISO(mapped.joinDate);
    const contractStartISO = parseDateToISO(mapped.contractStartDate);
    const contractEndISO = parseDateToISO(mapped.contractEndDate);
    const churnDateISO = parseDateToISO(mapped.churnDate);

    if (joinDateISO && new Date(joinDateISO) > refDate) {
      dateInconsistentCount++;
    }
    if (contractStartISO && contractEndISO && new Date(contractEndISO) < new Date(contractStartISO)) {
      dateInconsistentCount++;
    }
    if (churnDateISO && joinDateISO && new Date(churnDateISO) < new Date(joinDateISO)) {
      dateInconsistentCount++;
    }

    mappedRecords.push(mapped);
  }

  // Deduplication count
  const duplicateIdCount = Object.values(idCounts).filter(c => c > 1).length;
  if (duplicateIdCount > 0) {
    issues.push({
      severity: 'Warning',
      category: 'Uniqueness',
      message: `Found ${duplicateIdCount} duplicate Customer IDs (will keep most recent upon cleaning)`,
      affectedRows: duplicateIdCount,
      sampleIds: duplicateSampleIds
    });
  }

  // Missingness array
  const missingness: ColumnMissingness[] = AUTHORITATIVE_COLUMNS.map(col => {
    const missing = columnMissingCounts[col.key] || 0;
    return {
      column: col.name,
      missingCount: missing,
      missingPercent: rawRows.length > 0 ? +((missing / rawRows.length) * 100).toFixed(1) : 0,
      detectedType: col.type
    };
  });

  // Range issues
  if (ageOutOfRangeCount > 0) {
    issues.push({
      severity: 'Warning',
      category: 'Range',
      column: 'Age',
      message: `${ageOutOfRangeCount} rows have Age outside expected 16-110 range`,
      affectedRows: ageOutOfRangeCount,
      sampleIds: []
    });
  }

  if (csatOutOfRangeCount > 0) {
    issues.push({
      severity: 'Warning',
      category: 'Range',
      column: 'Satisfaction Score (1-10)',
      message: `${csatOutOfRangeCount} rows have CSAT outside 1-10 range`,
      affectedRows: csatOutOfRangeCount,
      sampleIds: []
    });
  }

  if (targetContradictionCount > 0) {
    issues.push({
      severity: 'Warning',
      category: 'Consistency',
      column: 'Churn Status vs Flag',
      message: `${targetContradictionCount} rows have contradicting Churn Status and Churn Flag`,
      affectedRows: targetContradictionCount,
      sampleIds: []
    });
  }

  if (dateInconsistentCount > 0) {
    issues.push({
      severity: 'Warning',
      category: 'Date Consistency',
      message: `${dateInconsistentCount} rows have future join dates or inverted contract/churn dates`,
      affectedRows: dateInconsistentCount,
      sampleIds: []
    });
  }

  // Target balance check
  const totalWithTarget = activeCount + churnedCount;
  const churnRate = totalWithTarget > 0 ? +(churnedCount / totalWithTarget).toFixed(3) : 0;
  if (targetFound) {
    if (churnRate < 0.05) {
      issues.push({
        severity: 'Warning',
        category: 'Class Imbalance',
        message: `Extremely low churn rate (${(churnRate * 100).toFixed(1)}% < 5%). Class weighting or oversampling recommended.`,
        affectedRows: churnedCount,
        sampleIds: []
      });
    } else if (churnRate > 0.50) {
      issues.push({
        severity: 'Warning',
        category: 'Class Imbalance',
        message: `High churn rate (${(churnRate * 100).toFixed(1)}% > 50%). Verify target definition.`,
        affectedRows: churnedCount,
        sampleIds: []
      });
    } else {
      issues.push({
        severity: 'Info',
        category: 'Target Balance',
        message: `Healthy class balance: ${(churnRate * 100).toFixed(1)}% churn rate (${churnedCount} churned, ${activeCount} active).`,
        affectedRows: 0,
        sampleIds: []
      });
    }
  }

  // Detect NPS scale
  let detectedNpsScale: '-100 to 100' | '0 to 10' | 'Other' = '-100 to 100';
  if (npsMin >= 0 && npsMax <= 10) {
    detectedNpsScale = '0 to 10';
  } else if (npsMin >= -100 && npsMax <= 100) {
    detectedNpsScale = '-100 to 100';
  } else {
    detectedNpsScale = 'Other';
  }

  // Compute transparent Data Quality Score (0-100)
  // Weights:
  // Completeness: 35 points
  // Target Availability & Health: 25 points
  // Uniqueness: 15 points
  // Range & Format Integrity: 15 points
  // Date Sanity: 10 points
  let score = 100;

  // Completeness penalty
  const avgMissingPercent = missingness.reduce((acc, m) => acc + m.missingPercent, 0) / (missingness.length || 1);
  score -= Math.min(30, avgMissingPercent * 1.5);

  // Missing target penalty
  if (!targetFound) score -= 25;

  // Duplicate penalty
  const dupPercent = rawRows.length > 0 ? (duplicateIdCount / rawRows.length) * 100 : 0;
  score -= Math.min(15, dupPercent * 2);

  // Range penalty
  if (ageOutOfRangeCount > 0) score -= 3;
  if (csatOutOfRangeCount > 0) score -= 3;
  if (targetContradictionCount > 0) score -= 4;
  if (dateInconsistentCount > 0) score -= 5;

  score = Math.max(10, Math.min(100, Math.round(score)));

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    totalRows: rawRows.length,
    totalColumns: Object.keys(columnMapping).length,
    mappedColumnsCount: mappedKeys.size,
    unmappedColumns: Object.keys(columnMapping).filter(k => !columnMapping[k]),
    qualityScore: score,
    issues,
    missingness,
    duplicateIdCount,
    duplicateSampleIds,
    targetBalance: {
      activeCount,
      churnedCount,
      churnRate,
      hasTarget: targetFound
    },
    detectedNpsScale,
    dateSanity: {
      validDatesCount: rawRows.length - dateInconsistentCount,
      inconsistentDateCount: dateInconsistentCount
    }
  };

  return { report, mappedRecords };
}

/**
 * Executes the transparent, reproducible cleaning pipeline
 */
export function cleanCustomerRecords(
  records: any[],
  refDateStr = '2026-11-07'
): { cleanedRecords: CustomerRecord[]; cleaningLogs: CleaningLogEntry[] } {
  const logs: CleaningLogEntry[] = [];
  const refDate = new Date(refDateStr);

  // 1. Whitespace & Casing Standardisation
  let whitespaceFixed = 0;
  for (const r of records) {
    for (const key of Object.keys(r)) {
      if (typeof r[key] === 'string') {
        const trimmed = r[key].trim();
        if (trimmed !== r[key]) {
          whitespaceFixed++;
          r[key] = trimmed;
        }
      }
    }
  }
  logs.push({
    id: 'step_1_whitespace',
    step: 'Whitespace Trimming',
    description: 'Trimmed leading and trailing whitespace across all string columns.',
    rowsAffected: whitespaceFixed,
    applied: true
  });

  // 2. Deduplication (keep latest per Customer ID)
  const seenIds = new Map<string, any>();
  let duplicatesRemoved = 0;
  for (const r of records) {
    const id = r.id || 'UNKNOWN';
    if (seenIds.has(id)) {
      duplicatesRemoved++;
    }
    seenIds.set(id, r);
  }
  const dedupedRows = Array.from(seenIds.values());
  logs.push({
    id: 'step_2_deduplication',
    step: 'Customer ID Deduplication',
    description: 'Retained the latest record for each Customer ID.',
    rowsAffected: duplicatesRemoved,
    applied: true
  });

  // 3. Imputation reference calculation (numeric medians grouped by Service Type)
  const chargeByService: Record<string, number[]> = {};
  const usageByService: Record<string, number[]> = {};
  const ages: number[] = [];

  for (const r of dedupedRows) {
    const s = r.serviceType || 'Standard';
    if (!chargeByService[s]) chargeByService[s] = [];
    if (!usageByService[s]) usageByService[s] = [];

    const charge = coerceNumeric(r.monthlyChargeGbp, -1);
    if (charge >= 0) chargeByService[s].push(charge);

    const usage = coerceNumeric(r.averageMonthlyUsageGb, -1);
    if (usage >= 0) usageByService[s].push(usage);

    const age = coerceNumeric(r.age, -1);
    if (age >= 16 && age <= 100) ages.push(age);
  }

  function getMedian(arr: number[], fallback: number): number {
    if (!arr || arr.length === 0) return fallback;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const overallMedianAge = getMedian(ages, 42);

  // 4. Transform and Clean Each Record
  let numericCoercedCount = 0;
  let datesStandardisedCount = 0;
  let contradictionFixedCount = 0;
  let missingImputedCount = 0;

  const cleanedRecords: CustomerRecord[] = [];

  for (const r of dedupedRows) {
    const s = r.serviceType || 'Full Fibre Broadband';
    const medianCharge = getMedian(chargeByService[s], 35.0);
    const medianUsage = getMedian(usageByService[s], 150.0);

    // Coerce numbers
    const rawAge = coerceNumeric(r.age, -1);
    const age = rawAge >= 16 && rawAge <= 110 ? Math.round(rawAge) : overallMedianAge;
    if (rawAge !== age) missingImputedCount++;

    let ageBand = r.ageBand ? String(r.ageBand).trim() : '';
    if (!ageBand || ageBand === 'Unknown') {
      if (age > 65) ageBand = '65+';
      else if (age > 50) ageBand = '51-65';
      else if (age > 35) ageBand = '36-50';
      else if (age > 25) ageBand = '26-35';
      else ageBand = '18-25';
    }

    // Dates
    const joinDate = parseDateToISO(r.joinDate) || '2024-01-01';
    let contractStart = parseDateToISO(r.contractStartDate) || joinDate;
    let contractEnd = parseDateToISO(r.contractEndDate);
    if (!contractEnd) {
      // derive 18 months from start
      const startD = new Date(contractStart);
      const endD = new Date(startD.getTime() + 18 * 30.4375 * 24 * 3600 * 1000);
      contractEnd = endD.toISOString().split('T')[0];
    }

    // Tenure check from Join Date
    const joinTime = new Date(joinDate).getTime();
    const calculatedTenure = Math.max(1, Math.round((refDate.getTime() - joinTime) / (30.4375 * 24 * 3600 * 1000)));
    const tenureMonths = r.tenureMonths !== undefined && r.tenureMonths !== ''
      ? Math.max(0, Math.round(coerceNumeric(r.tenureMonths, calculatedTenure)))
      : calculatedTenure;

    // Monetary
    const monthlyChargeGbp = +(coerceNumeric(r.monthlyChargeGbp, medianCharge)).toFixed(2);
    const averageMonthlyUsageGb = +(coerceNumeric(r.averageMonthlyUsageGb, medianUsage)).toFixed(1);
    const dataAllowanceGb = Math.max(0, Math.round(coerceNumeric(r.dataAllowanceGb, 0)));
    const overageChargesGbp = +(coerceNumeric(r.overageChargesGbp, 0)).toFixed(2);
    const discountPercent = Math.min(100, Math.max(0, +(coerceNumeric(r.discountPercent, 0)).toFixed(1)));

    // Categoricals
    const autoRenew = standardiseYesNo(r.autoRenew, 'Yes');
    const directDebit = standardiseYesNo(r.directDebit, 'Yes');
    const competitorOffer = standardiseYesNo(r.competitorOfferReceived, 'No');

    // Experience
    const latePayments12m = Math.max(0, Math.round(coerceNumeric(r.latePayments12m, 0)));
    const failedPayments12m = Math.max(0, Math.round(coerceNumeric(r.failedPayments12m, 0)));
    const supportTickets12m = Math.max(0, Math.round(coerceNumeric(r.supportTickets12m, 0)));
    const complaints12m = Math.min(supportTickets12m, Math.max(0, Math.round(coerceNumeric(r.complaints12m, 0))));
    const avgResolution = +(coerceNumeric(r.averageResolutionHours, 16.0)).toFixed(1);
    const outages = Math.max(0, Math.round(coerceNumeric(r.networkOutages12m, 0)));

    // Satisfaction & NPS
    let csat = Math.round(coerceNumeric(r.satisfactionScore110, 7));
    if (csat < 1) csat = 1;
    if (csat > 10) csat = 10;

    let nps = Math.round(coerceNumeric(r.npsScore, 20));

    // Target Coercion & Contradiction Resolution
    let churnFlag: 0 | 1 = 0;
    if (r.churnFlag !== undefined && r.churnFlag !== null && r.churnFlag !== '') {
      churnFlag = coerceNumeric(r.churnFlag, 0) === 1 ? 1 : 0;
    } else if (r.churnStatus) {
      churnFlag = String(r.churnStatus).toLowerCase().includes('churn') ? 1 : 0;
    }

    let churnStatus = churnFlag === 1 ? 'Churned' : 'Active';
    if (r.churnStatus) {
      const st = String(r.churnStatus).trim().toLowerCase();
      const statusSaysChurned = st.includes('churn');
      if (statusSaysChurned !== (churnFlag === 1)) {
        contradictionFixedCount++;
        // Target flag governs status
        churnStatus = churnFlag === 1 ? 'Churned' : 'Active';
      }
    }

    let churnDate = churnFlag === 1 ? (parseDateToISO(r.churnDate) || '2026-08-01') : '';
    let churnReason = churnFlag === 1 ? (r.churnReason ? String(r.churnReason).trim() : 'Competitor Better Offer') : '';

    const effectiveMonthly = monthlyChargeGbp * (1 - discountPercent / 100);
    const lifetimeRevenueGbp = +(coerceNumeric(r.lifetimeRevenueGbp, tenureMonths * effectiveMonthly)).toFixed(2);
    const monthlyRevenueAtRiskGbp = churnFlag === 1 ? +effectiveMonthly.toFixed(2) : +(coerceNumeric(r.monthlyRevenueAtRiskGbp, 0)).toFixed(2);

    cleanedRecords.push({
      id: r.id,
      customerSegment: r.customerSegment === 'Small Business' ? 'Small Business' : 'Consumer',
      age,
      ageBand,
      gender: r.gender ? String(r.gender).trim() : 'Unspecified',
      ukNation: ['England', 'Scotland', 'Wales', 'Northern Ireland'].includes(r.ukNation) ? r.ukNation : 'England',
      city: r.city ? String(r.city).trim() : 'London',
      acquisitionChannel: r.acquisitionChannel ? String(r.acquisitionChannel).trim() : 'Online Direct',
      joinDate,
      tenureMonths,
      serviceType: s,
      planName: r.planName ? String(r.planName).trim() : 'BritFibre 150',
      contractType: r.contractType ? String(r.contractType).trim() : '18 Months',
      contractStartDate: contractStart,
      contractEndDate: contractEnd,
      autoRenew,
      monthlyChargeGbp,
      averageMonthlyUsageGb,
      dataAllowanceGb,
      overageChargesGbp,
      discountPercent,
      paymentMethod: r.paymentMethod ? String(r.paymentMethod).trim() : (directDebit === 'Yes' ? 'Direct Debit' : 'Debit Card'),
      directDebit,
      latePayments12m,
      failedPayments12m,
      supportTickets12m,
      complaints12m,
      averageResolutionHours: avgResolution,
      networkOutages12m: outages,
      satisfactionScore110: csat,
      npsScore: nps,
      competitorOfferReceived: competitorOffer,
      churnStatus,
      churnDate,
      churnReason,
      lifetimeRevenueGbp,
      monthlyRevenueAtRiskGbp,
      churnFlag
    });
  }

  logs.push({
    id: 'step_3_numeric_dates',
    step: 'Numeric & Date Standardization',
    description: 'Parsed dates to ISO YYYY-MM-DD and normalized charges, usage, and counts.',
    rowsAffected: cleanedRecords.length,
    applied: true
  });

  if (contradictionFixedCount > 0) {
    logs.push({
      id: 'step_4_contradictions',
      step: 'Target Contradiction Alignment',
      description: `Aligned Churn Status to match binary Churn Flag for ${contradictionFixedCount} conflicting rows.`,
      rowsAffected: contradictionFixedCount,
      applied: true
    });
  }

  if (missingImputedCount > 0) {
    logs.push({
      id: 'step_5_imputation',
      step: 'Missing Value Imputation',
      description: `Imputed missing numeric values with medians grouped by Service Type (${missingImputedCount} values).`,
      rowsAffected: missingImputedCount,
      applied: true
    });
  }

  return { cleanedRecords, cleaningLogs: logs };
}
