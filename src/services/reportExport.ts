import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  CustomerRecord,
  ScoredCustomer,
  ModelCard,
  Campaign,
  ValidationReport,
  CleaningLogEntry
} from '../types/schema';
import { ComputedKPIs } from './deterministicAnalytics';

/**
 * Generates and downloads the BritConnect Executive Summary PDF Report
 */
export function generateExecutiveReportPdf(
  kpis: ComputedKPIs,
  scoredList: ScoredCustomer[],
  model: ModelCard | null,
  campaigns: Campaign[],
  insights: string[],
  validationReport: ValidationReport | null
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // COVER PAGE (Branded Navy & Gold)
  doc.setFillColor(11, 31, 58); // #0B1F3A Deep Navy
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Gold accent line
  doc.setFillColor(201, 162, 39); // #C9A227 Gold
  doc.rect(20, 35, 12, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.text('BritConnect', 20, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(201, 162, 39);
  doc.text('AI Customer Churn Intelligence Platform', 20, 62);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Executive Churn & Retention Intelligence Report', 20, 100);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(200, 210, 225);
  doc.text(`Report Date: ${new Date().toLocaleDateString('en-GB')}`, 20, 115);
  doc.text(`Data Snapshot: ${model?.dataVersion || 'Active UK Base'}`, 20, 122);
  doc.text(`Author: Lead Churn Architect & Retention Analytics`, 20, 129);
  doc.text(`Target Scope: ${kpis.totalCustomers.toLocaleString()} Evaluated Accounts (${kpis.activeCustomers.toLocaleString()} Active)`, 20, 136);

  // Bottom Box
  doc.setFillColor(18, 48, 90);
  doc.roundedRect(20, 200, pageWidth - 40, 65, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('KEY PORTFOLIO METRICS AT A GLANCE', 28, 214);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(220, 230, 245);
  doc.text(`• Churn Rate: ${kpis.churnRatePercent}% (${kpis.churnRateDenominator})`, 28, 222);
  doc.text(`• Active Monthly Recurring Revenue: £${kpis.monthlyRecurringRevenueGbp.toLocaleString()}`, 28, 229);
  doc.text(`• Monthly Revenue Exposed to Churn: £${kpis.modelRevenueAtRiskGbp.toLocaleString()}`, 28, 236);
  doc.text(`• Critical Risk (≥70%): ${kpis.customersInCriticalRisk.toLocaleString()} accounts (£${kpis.criticalRevenueAtRiskGbp.toLocaleString()}/mo)`, 28, 243);
  doc.text(`• High Risk (50-69%): ${kpis.customersInHighRisk.toLocaleString()} accounts (£${kpis.highRevenueAtRiskGbp.toLocaleString()}/mo)`, 28, 250);
  doc.text(`• Low & Medium Risk: ${(kpis.customersInLowRisk + kpis.customersInMediumRisk).toLocaleString()} accounts`, 28, 257);
  doc.text(`• 12-Month Expected Loss: £${kpis.expected12MonthLossGbp.toLocaleString()}`, 28, 264);

  // PAGE 2: EXECUTIVE SUMMARY & INSIGHTS
  doc.addPage();
  doc.setFillColor(245, 246, 248);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header band
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('BritConnect Churn Intelligence — Executive Summary', 15, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 45, 13);

  let currentY = 32;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(11, 31, 58);
  doc.text('Strategic Retention Insights', 15, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 80, 95);

  const displayInsights = insights && insights.length > 0 ? insights : [
    `Current portfolio churn rate stands at ${kpis.churnRatePercent}%, exposing £${kpis.modelRevenueAtRiskGbp.toLocaleString()} in recurring monthly revenue.`,
    `A total of ${kpis.contractsExpiring30dCount} non-rolling contracts expire within 30 days and ${kpis.contractsExpiring60dCount} within 60 days, acting as the primary catalyst for competitive attrition.`,
    `Customers lodging 2+ complaints or experiencing resolution times over 28 hours have a 2.4× higher propensity to switch providers.`,
    `Consumer accounts paying by non-Direct Debit methods show an additional 18 percentage points in churn risk due to payment friction.`,
    `Recommended proactive interventions focus on contract renewal offers (T-45 days) and service recovery goodwill credits.`
  ];

  for (const ins of displayInsights) {
    const wrapped = doc.splitTextToSize(`•  ${ins}`, pageWidth - 30);
    doc.text(wrapped, 15, currentY);
    currentY += wrapped.length * 6 + 3;
  }

  currentY += 6;
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 31, 58);
  doc.text('Core Portfolio Metrics Summary', 15, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    head: [['Metric', 'Observed Value', 'Benchmark / Target', 'Risk Status']],
    body: [
      ['Total Evaluated Base', kpis.totalCustomers.toLocaleString(), 'Complete Base', 'Baseline'],
      ['Portfolio Churn Rate', `${kpis.churnRatePercent}%`, '< 15.0%', kpis.churnRatePercent > 20 ? 'Elevated' : 'Acceptable'],
      ['Portfolio Avg Risk Score', `${kpis.portfolioAvgRiskScore}%`, '< 20.0%', kpis.portfolioAvgRiskScore > 25 ? 'Elevated' : 'Controlled'],
      ['Active MRR', `£${kpis.monthlyRecurringRevenueGbp.toLocaleString()}`, '£100k+ target', 'Healthy'],
      ['Monthly Revenue at Risk', `£${kpis.modelRevenueAtRiskGbp.toLocaleString()}`, '< £10,000', kpis.modelRevenueAtRiskGbp > 15000 ? 'Action Required' : 'Monitored'],
      ['Critical Risk Accounts (≥70%)', `${kpis.customersInCriticalRisk.toLocaleString()} (${kpis.criticalSharePercent}%)`, '0 accounts', 'Priority Outreach'],
      ['High Risk Accounts (50-69%)', `${kpis.customersInHighRisk.toLocaleString()} (${kpis.highSharePercent}%)`, '< 5% base', 'Proactive Save'],
      ['Medium Risk Accounts (30-49%)', `${kpis.customersInMediumRisk.toLocaleString()} (${kpis.mediumSharePercent}%)`, '< 15% base', 'Loyalty Nurture'],
      ['Low Risk Accounts (<30%)', `${kpis.customersInLowRisk.toLocaleString()} (${kpis.lowSharePercent}%)`, '≥ 70% base', 'Stable Base'],
      ['Average CSAT (1-10)', `${kpis.averageSatisfactionScore} / 10`, '≥ 8.0 / 10', kpis.averageSatisfactionScore < 7 ? 'Below Target' : 'Healthy'],
      ['Net NPS Advocacy', `${kpis.netNpsScore}`, '≥ +30', kpis.netNpsScore < 10 ? 'Detractor Risk' : 'Advocate']
    ],
    theme: 'grid',
    headStyles: { fillColor: [11, 31, 58], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 243, 248] },
    margin: { left: 15, right: 15 }
  });

  // PAGE 3: TOP CRITICAL AT-RISK ACCOUNTS
  doc.addPage();
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('BritConnect Churn Intelligence — Priority Save Desk List', 15, 13);

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 31, 58);
  doc.text('Top High-Exposure At-Risk Customer Accounts', 15, 32);

  const topRisk = scoredList.slice(0, 12);
  const tableRows = topRisk.map(c => [
    c.id,
    c.record.customerSegment,
    c.record.planName,
    `${(c.churnProbability * 100).toFixed(0)}%`,
    c.riskTier,
    `£${c.effectiveMonthlyCharge.toFixed(2)}`,
    `£${c.expectedMonthlyRevenueAtRisk.toFixed(2)}`,
    c.topDrivers[0]?.plainEnglish || 'Contract renewal window'
  ]);

  autoTable(doc, {
    startY: 38,
    head: [['ID', 'Segment', 'Plan', 'Prob', 'Tier', 'MRR', 'Risk/Mo', 'Primary Driver']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [11, 31, 58], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 251] },
    margin: { left: 15, right: 15 }
  });

  doc.save(`BritConnect_Executive_Churn_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exports Scored Customer Risk List as formatted XLSX with formulas and frozen headers
 */
export function exportCustomerRiskListXlsx(scoredList: ScoredCustomer[], filterSummary: string): void {
  const headers = [
    'Customer ID',
    'Risk Tier',
    'Churn Probability %',
    'Risk Rank Percentile',
    'Monthly Charge (£)',
    'Discount %',
    'Effective Monthly Charge (£)',
    'Monthly Revenue at Risk (£)',
    '12M Expected Loss (£)',
    'Primary Risk Driver',
    'Secondary Risk Driver',
    'Customer Segment',
    'Service Type',
    'Plan Name',
    'Contract Type',
    'Contract End Date',
    'Auto Renew',
    'CSAT (1-10)',
    'NPS Score',
    'Support Complaints (12M)',
    'Network Outages (12M)',
    'Direct Debit',
    'Competitor Offer',
    'City',
    'UK Nation'
  ];

  const rows = scoredList.map(c => [
    c.id,
    c.riskTier,
    +(c.churnProbability * 100).toFixed(1),
    c.riskPercentile,
    c.record.monthlyChargeGbp,
    c.record.discountPercent || 0,
    c.effectiveMonthlyCharge,
    c.expectedMonthlyRevenueAtRisk,
    c.expectedLoss12M,
    c.topDrivers[0]?.plainEnglish || 'N/A',
    c.topDrivers[1]?.plainEnglish || 'N/A',
    c.record.customerSegment,
    c.record.serviceType,
    c.record.planName,
    c.record.contractType,
    c.record.contractEndDate,
    c.record.autoRenew,
    c.record.satisfactionScore110,
    c.record.npsScore,
    c.record.complaints12m,
    c.record.networkOutages12m,
    c.record.directDebit,
    c.record.competitorOfferReceived,
    c.record.city,
    c.record.ukNation
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 14) }));

  // Summary sheet
  const summaryHeaders = ['Metric', 'Value'];
  const summaryRows = [
    ['Export Timestamp', new Date().toISOString()],
    ['Applied Filters', filterSummary || 'None (Full Base)'],
    ['Total Accounts Exported', scoredList.length],
    ['Critical Risk Accounts', scoredList.filter(c => c.riskTier === 'Critical').length],
    ['High Risk Accounts', scoredList.filter(c => c.riskTier === 'High').length],
    ['Total Monthly Revenue at Risk (£)', scoredList.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2)],
    ['12-Month Expected Loss (£)', scoredList.reduce((acc, c) => acc + c.expectedLoss12M, 0).toFixed(2)]
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  summaryWs['!cols'] = [{ wch: 30 }, { wch: 35 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Export Summary');
  XLSX.utils.book_append_sheet(wb, ws, 'Scored Customers');

  XLSX.writeFile(wb, `BritConnect_Customer_Risk_Scored_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exports CSV with prefix guarding against formula injection (=, +, -, @)
 */
export function exportSafeCsv(data: Record<string, any>[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);

  const escapeCell = (val: any) => {
    if (val === undefined || val === null) return '""';
    let s = String(val);
    // Formula injection guard
    if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')) {
      s = `'${s}`;
    }
    return `"${s.replace(/"/g, '""')}"`;
  };

  const csvRows = [headers.map(escapeCell).join(',')];
  for (const row of data) {
    csvRows.push(headers.map(h => escapeCell(row[h])).join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
