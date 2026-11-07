import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import {
  generateExecutiveReportPdf,
  exportCustomerRiskListXlsx,
  exportSafeCsv
} from '../../services/reportExport';
import {
  CustomerRecord,
  ScoredCustomer,
  ModelCard,
  Campaign,
  ValidationReport,
  CleaningLogEntry
} from '../../types/schema';
import { ComputedKPIs } from '../../services/deterministicAnalytics';

interface ReportsViewProps {
  kpis: ComputedKPIs | null;
  records: CustomerRecord[];
  scoredCustomers: ScoredCustomer[];
  activeModel: ModelCard | null;
  campaigns: Campaign[];
  validationReport: ValidationReport | null;
  cleaningLogs: CleaningLogEntry[];
  aiSummary: string[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  kpis,
  records,
  scoredCustomers,
  activeModel,
  campaigns,
  validationReport,
  cleaningLogs,
  aiSummary
}) => {
  const [reportTitle, setReportTitle] = useState('BritConnect Q4 Executive Churn Intelligence Briefing');
  const [analystNotes, setAnalystNotes] = useState('Prepared for the Chief Commercial Officer & Retention Steering Group.');
  const [includeKpis, setIncludeKpis] = useState(true);
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [includeTopRisk, setIncludeTopRisk] = useState(true);
  const [includeCampaigns, setIncludeCampaigns] = useState(true);
  const [includeQualityAppendix, setIncludeQualityAppendix] = useState(true);

  const handleDownloadExecutivePdf = () => {
    if (!kpis) return;
    generateExecutiveReportPdf(
      kpis,
      scoredCustomers,
      activeModel,
      campaigns,
      aiSummary,
      validationReport
    );
  };

  const handleDownloadScoredXlsx = () => {
    exportCustomerRiskListXlsx(scoredCustomers, 'All Active Customers');
  };

  const handleDownloadCleaningCsv = () => {
    exportSafeCsv(cleaningLogs, `BritConnect_Cleaning_Log_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleDownloadCleanedData = () => {
    exportSafeCsv(records, `BritConnect_Cleaned_Dataset_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="font-serif-heading text-2xl font-bold text-slate-900 dark:text-white">
          Reports & Export Centre
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Export executive PDF briefings with branded navy/gold styling, formatted XLSX spreadsheets with frozen headers, and sanitized CSV extracts.
        </p>
      </div>

      {/* One-Click Executive Downloads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Executive PDF */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-5 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#0B1F3A] text-[#E5C566] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Executive Summary Report (PDF)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete branded 3-page executive document with cover, KPI scorecards, AI narrative insights, and high-risk account lists.
            </p>
          </div>
          <button
            onClick={handleDownloadExecutivePdf}
            disabled={!kpis}
            className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Download Executive PDF</span>
          </button>
        </div>

        {/* Card 2: Scored Customer List XLSX */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-5 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#1D4C8F]/20 text-[#1D4C8F] dark:text-[#E5C566] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Customer Risk List (XLSX)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formatted multi-sheet Excel workbook with formatted currency/percentage columns, auto-fit column widths, and frozen headers.
            </p>
          </div>
          <button
            onClick={handleDownloadScoredXlsx}
            disabled={scoredCustomers.length === 0}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#1D4C8F]" />
            <span>Download Scored XLSX</span>
          </button>
        </div>

        {/* Card 3: Cleaned Dataset CSV */}
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-5 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cleaned Dataset & Audit Log (CSV)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formula-injection-safe CSV export of all deduplicated, standardised customer records and cleaning transformation log.
            </p>
          </div>
          <button
            onClick={handleDownloadCleanedData}
            disabled={records.length === 0}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Cleaned CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Report Builder Panel */}
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Custom Report Builder & Section Configurator
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select the exact analytical sections, add bespoke analyst commentary, and generate tailored PDF decks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Custom Report Title
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#C9A227]"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Executive Notes & Governance Subtitle
            </label>
            <input
              type="text"
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#C9A227]"
            />
          </div>
        </div>

        {/* Section Toggles */}
        <div className="space-y-2 text-xs pt-2">
          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
            Included Report Sections
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-[#1E3452] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
              <input
                type="checkbox"
                checked={includeKpis}
                onChange={(e) => setIncludeKpis(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-800 dark:text-slate-200 font-medium">1. Core KPI Scorecards & MRR</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-[#1E3452] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
              <input
                type="checkbox"
                checked={includeAiSummary}
                onChange={(e) => setIncludeAiSummary(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-800 dark:text-slate-200 font-medium">2. AI Executive Retention Insights</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-[#1E3452] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
              <input
                type="checkbox"
                checked={includeTopRisk}
                onChange={(e) => setIncludeTopRisk(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-800 dark:text-slate-200 font-medium">3. Priority Save Desk Customer Table</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-[#1E3452] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
              <input
                type="checkbox"
                checked={includeCampaigns}
                onChange={(e) => setIncludeCampaigns(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-800 dark:text-slate-200 font-medium">4. Campaign Holdout & Uplift Audit</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-[#1E3452] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
              <input
                type="checkbox"
                checked={includeQualityAppendix}
                onChange={(e) => setIncludeQualityAppendix(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-800 dark:text-slate-200 font-medium">5. Data Quality & Cleaning Appendix</span>
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-[#1E3452] flex justify-end">
          <button
            onClick={handleDownloadExecutivePdf}
            disabled={!kpis}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Generate Configured PDF Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
