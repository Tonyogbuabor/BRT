import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  RotateCw,
  Sliders,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ValidationReport, CleaningLogEntry, CustomerRecord } from '../../types/schema';
import { exportSafeCsv } from '../../services/reportExport';

interface QualityViewProps {
  report: ValidationReport | null;
  cleaningLogs: CleaningLogEntry[];
  cleanedRecords: CustomerRecord[];
  onReRunCleaning: () => void;
}

export const QualityView: React.FC<QualityViewProps> = ({
  report,
  cleaningLogs,
  cleanedRecords,
  onReRunCleaning
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'missingness' | 'cleaning_log' | 'balance'>('issues');

  if (!report) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl">
        <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
          No Validation Report Generated Yet
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Upload a customer dataset or load the demo base to trigger automatic schema audit and data quality scoring.
        </p>
      </div>
    );
  }

  const handleExportCleaned = () => {
    exportSafeCsv(cleanedRecords, `BritConnect_Cleaned_Dataset_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportValidationReport = () => {
    const rows = report.issues.map(i => ({
      Severity: i.severity,
      Category: i.category,
      Column: i.column || 'Dataset Wide',
      Message: i.message,
      AffectedRows: i.affectedRows,
      Samples: i.sampleIds.join('; ')
    }));
    exportSafeCsv(rows, `BritConnect_Validation_Issues_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner with Quality Score Gauge */}
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Circular Score Gauge */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - report.qualityScore / 100)}`}
                className={
                  report.qualityScore >= 80
                    ? 'text-emerald-500'
                    : report.qualityScore >= 60
                    ? 'text-[#C9A227]'
                    : 'text-[#7A0C1E]'
                }
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                {report.qualityScore}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Score</span>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif-heading text-xl font-bold text-slate-900 dark:text-white">
              Data Quality Audit & Pipeline Verification
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated {report.totalRows.toLocaleString()} customer records across {report.mappedColumnsCount} mapped dictionary columns.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Duplicates: <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">{report.duplicateIdCount}</strong></span>
              <span>·</span>
              <span>Target: <strong className="font-mono-tabular text-emerald-600 dark:text-emerald-400">{(report.targetBalance.churnRate * 100).toFixed(1)}% churn rate</strong></span>
              <span>·</span>
              <span>NPS Scale: <strong className="font-mono-tabular text-[#1D4C8F] dark:text-[#E5C566]">{report.detectedNpsScale}</strong></span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCleaned}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Download Cleaned Data (CSV)</span>
          </button>

          <button
            onClick={handleExportValidationReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[#1E3452] pb-1">
        <button
          onClick={() => setActiveTab('issues')}
          className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'issues'
              ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Validation Issues ({report.issues.length})
        </button>

        <button
          onClick={() => setActiveTab('missingness')}
          className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'missingness'
              ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Column Missingness ({report.missingness.filter(m => m.missingCount > 0).length} columns)
        </button>

        <button
          onClick={() => setActiveTab('cleaning_log')}
          className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'cleaning_log'
              ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Cleaning Transformation Log ({cleaningLogs.length} steps)
        </button>

        <button
          onClick={() => setActiveTab('balance')}
          className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'balance'
              ? 'border-b-2 border-[#C9A227] text-[#0B1F3A] dark:text-white font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Target Balance & Range Sanity
        </button>
      </div>

      {/* TAB 1: Issues List */}
      {activeTab === 'issues' && (
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1E3452] text-slate-500 font-semibold bg-slate-50 dark:bg-[#0B1F3A]">
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Affected Column</th>
                <th className="py-2.5 px-3">Finding Description</th>
                <th className="py-2.5 px-3 text-right">Rows</th>
                <th className="py-2.5 px-3">Sample IDs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3452]/50">
              {report.issues.map((issue, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        issue.severity === 'Error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : issue.severity === 'Warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {issue.severity === 'Error' ? <AlertTriangle className="w-3 h-3" /> : issue.severity === 'Warning' ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                      <span>{issue.severity}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">{issue.category}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{issue.column || 'Dataset Wide'}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{issue.message}</td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular font-bold text-slate-700 dark:text-slate-300">
                    {issue.affectedRows.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    {issue.sampleIds.length > 0 ? issue.sampleIds.join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Missingness Table */}
      {activeTab === 'missingness' && (
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1E3452] text-slate-500 font-semibold bg-slate-50 dark:bg-[#0B1F3A]">
                <th className="py-2.5 px-3">Column Name</th>
                <th className="py-2.5 px-3">Data Type</th>
                <th className="py-2.5 px-3 text-right">Missing Rows</th>
                <th className="py-2.5 px-3 text-right">Missing %</th>
                <th className="py-2.5 px-3">Completeness Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3452]/50">
              {report.missingness.map((col) => (
                <tr key={col.column} className="hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{col.column}</td>
                  <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{col.detectedType}</td>
                  <td className="py-2 px-3 text-right font-mono-tabular text-slate-700 dark:text-slate-300">{col.missingCount.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono-tabular font-bold text-slate-900 dark:text-white">{col.missingPercent}%</td>
                  <td className="py-2 px-3 w-48">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          col.missingPercent === 0
                            ? 'bg-emerald-500'
                            : col.missingPercent > 10
                            ? 'bg-[#7A0C1E]'
                            : 'bg-[#C9A227]'
                        }`}
                        style={{ width: `${100 - col.missingPercent}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Cleaning Transformation Log */}
      {activeTab === 'cleaning_log' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              The cleaning pipeline executes deterministic, logged transformations that standardise data without data leakage.
            </p>
            <button
              onClick={onReRunCleaning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Re-execute Pipeline</span>
            </button>
          </div>

          <div className="space-y-3">
            {cleaningLogs.map((log, lIdx) => (
              <div
                key={log.id}
                className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl flex items-start justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Step {lIdx + 1}: {log.step}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {log.description}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono-tabular font-bold text-xs text-slate-800 dark:text-slate-200">
                    {log.rowsAffected.toLocaleString()} rows
                  </span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Applied</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Target Balance & Sanity */}
      {activeTab === 'balance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-5 rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Target Class Distribution (Churn Flag)
            </h3>
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-[#1E3452]">
              <span className="text-slate-600 dark:text-slate-400">Active Customers (0)</span>
              <strong className="font-mono-tabular text-emerald-600 dark:text-emerald-400 text-sm">
                {report.targetBalance.activeCount.toLocaleString()} ({((report.targetBalance.activeCount / (report.totalRows || 1)) * 100).toFixed(1)}%)
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-[#1E3452]">
              <span className="text-slate-600 dark:text-slate-400">Churned Customers (1)</span>
              <strong className="font-mono-tabular text-[#7A0C1E] dark:text-[#E5C566] text-sm">
                {report.targetBalance.churnedCount.toLocaleString()} ({((report.targetBalance.churnedCount / (report.totalRows || 1)) * 100).toFixed(1)}%)
              </strong>
            </div>
            <p className="text-[11px] text-slate-500">
              Class balance is monitored: when churn rate is below 5%, balanced class weighting is enforced in model loss functions.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-5 rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Date Sanity & Contract Chronology
            </h3>
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-[#1E3452]">
              <span className="text-slate-600 dark:text-slate-400">Valid ISO Dates Passed</span>
              <strong className="font-mono-tabular text-emerald-600 dark:text-emerald-400 text-sm">
                {report.dateSanity.validDatesCount.toLocaleString()}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-[#1E3452]">
              <span className="text-slate-600 dark:text-slate-400">Inconsistent / Future Dates</span>
              <strong className="font-mono-tabular text-amber-600 text-sm">
                {report.dateSanity.inconsistentDateCount.toLocaleString()}
              </strong>
            </div>
            <p className="text-[11px] text-slate-500">
              Verifies Join Date ≤ 07/11/2026, Contract End Date ≥ Contract Start Date, and Churn Date ≥ Join Date.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
