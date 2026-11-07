import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RotateCw,
  Clock,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import {
  parseUploadedFile,
  buildAutoColumnMappings,
  downloadBlankCsvTemplate,
  downloadBlankXlsxTemplate,
  downloadDataDictionaryCsv,
  ParsedFileResult,
  ColumnMappingItem
} from '../../services/dataIngestion';
import { ColumnMappingModal } from './ColumnMappingModal';
import { CustomerRecord, DatasetVersion, ModelCard } from '../../types/schema';

interface UploadViewProps {
  onCommitImport: (
    parsedResult: ParsedFileResult,
    mapping: Record<string, string>,
    mode: 'replace' | 'append' | 'score_only'
  ) => void;
  datasetVersions: DatasetVersion[];
  recordsCount: number;
  activeModel: ModelCard | null;
  onLoadDemoData: () => void;
  onRetrainModel: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onCommitImport,
  datasetVersions,
  recordsCount,
  activeModel,
  onLoadDemoData,
  onRetrainModel
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedFile, setParsedFile] = useState<ParsedFileResult | null>(null);
  const [mappings, setMappings] = useState<ColumnMappingItem[] | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace' | 'score_only'>('replace');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File, sheet?: string) => {
    setIsLoading(true);
    try {
      const res = await parseUploadedFile(file, sheet);
      setParsedFile(res);
      if (res.sheets && res.sheets.length > 1) {
        setSelectedSheet(res.selectedSheet || res.sheets[0]);
      }
      const autoMappings = buildAutoColumnMappings(res.rawHeaders);
      setMappings(autoMappings);
      setShowMappingModal(true);
    } catch (err: any) {
      alert(`Error parsing file: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleConfirmMapping = (finalMapping: Record<string, string>) => {
    if (!parsedFile) return;
    setShowMappingModal(false);
    onCommitImport(parsedFile, finalMapping, importMode);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header text */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-slate-900 dark:text-white">
            Data Upload & Ingestion Centre
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload customer files in Excel (.xlsx, .xls, .ods), CSV, TSV, or JSON format.
            Auto-detects delimiters, removes UTF-8 BOM, and fuzzy-maps to the 38-column dictionary.
          </p>
        </div>

        {/* Download templates */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadBlankCsvTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Blank Template (CSV)</span>
          </button>

          <button
            onClick={downloadBlankXlsxTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#1D4C8F]" />
            <span>Blank Template (XLSX)</span>
          </button>

          <button
            onClick={downloadDataDictionaryCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Data Dictionary CSV</span>
          </button>
        </div>
      </div>

      {/* Stale Model Warning if data was updated after model was trained */}
      {recordsCount > 0 && activeModel && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Model trained on snapshot ({activeModel.rowCount.toLocaleString()} records).
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Current active database contains {recordsCount.toLocaleString()} records. Retraining is recommended for optimal accuracy.
              </p>
            </div>
          </div>
          <button
            onClick={onRetrainModel}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Retrain Champion Model
          </button>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-[#C9A227] bg-[#C9A227]/10 scale-[1.005]'
            : 'border-slate-300 dark:border-[#1E3452] bg-white dark:bg-[#0D1C30] hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-[#12305A]/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.ods,.csv,.tsv,.txt,.json,.ndjson"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-[#0B1F3A]/5 dark:bg-[#12305A] text-[#1D4C8F] dark:text-[#E5C566] flex items-center justify-center mb-4">
          <Upload className="w-7 h-7" />
        </div>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Drag and drop customer data files here, or click to browse
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md">
          Supports .xlsx, .xls, .xlsm, .ods, .csv, .tsv, .txt, and .json files up to 200MB.
          Client-side parsing ensures customer data remains strictly on your local device.
        </p>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
          <span>Delimiter auto-detection</span>
          <span>·</span>
          <span>UTF-8 BOM sanitisation</span>
          <span>·</span>
          <span>Multi-sheet Excel support</span>
        </div>
      </div>

      {/* Upload Mode Selector (When database already has records) */}
      {recordsCount > 0 && (
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Import Mode Strategy for Subsequent Files
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label
              className={`p-3.5 rounded-lg border text-xs cursor-pointer flex flex-col justify-between transition-all ${
                importMode === 'replace'
                  ? 'bg-[#12305A]/10 border-[#1D4C8F] text-[#0B1F3A] dark:text-white ring-1 ring-[#1D4C8F]'
                  : 'border-slate-200 dark:border-[#1E3452] text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Replace Entire Dataset</span>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
              </div>
              <p className="text-[11px] opacity-80">
                Wipes existing base and replaces it completely with the newly uploaded dataset.
              </p>
            </label>

            <label
              className={`p-3.5 rounded-lg border text-xs cursor-pointer flex flex-col justify-between transition-all ${
                importMode === 'append'
                  ? 'bg-[#12305A]/10 border-[#1D4C8F] text-[#0B1F3A] dark:text-white ring-1 ring-[#1D4C8F]'
                  : 'border-slate-200 dark:border-[#1E3452] text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Append / Merge (Upsert)</span>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                />
              </div>
              <p className="text-[11px] opacity-80">
                Matches by Customer ID: updates existing accounts and appends new ones.
              </p>
            </label>

            <label
              className={`p-3.5 rounded-lg border text-xs cursor-pointer flex flex-col justify-between transition-all ${
                importMode === 'score_only'
                  ? 'bg-[#12305A]/10 border-[#1D4C8F] text-[#0B1F3A] dark:text-white ring-1 ring-[#1D4C8F]'
                  : 'border-slate-200 dark:border-[#1E3452] text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Score-Only Batch</span>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'score_only'}
                  onChange={() => setImportMode('score_only')}
                />
              </div>
              <p className="text-[11px] opacity-80">
                Scores new customer file with existing model without altering model training data.
              </p>
            </label>
          </div>
        </div>
      )}

      {/* Demonstration Dataset Banner */}
      <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#0D1C30] dark:to-[#12305A]/40 border border-slate-200 dark:border-[#1E3452] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#C9A227]/20 flex items-center justify-center text-[#C9A227] shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Instant Demonstration Dataset Available
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate 1,200 verified customer records with real UK cities, full fibre plans, CSAT scores, and causal churn drivers.
            </p>
          </div>
        </div>

        <button
          onClick={onLoadDemoData}
          className="px-4 py-2 text-xs font-semibold text-[#0B1F3A] bg-[#C9A227] hover:bg-[#E5C566] rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer"
        >
          Generate Demo Data (1,200 Accounts)
        </button>
      </div>

      {/* Dataset Version History */}
      {datasetVersions.length > 0 && (
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Dataset Version History & Change Log
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              {datasetVersions.length} historical snapshot{datasetVersions.length > 1 ? 's' : ''} stored in IndexedDB
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E3452] text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Version Timestamp</th>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3 text-right">Row Count</th>
                  <th className="py-2.5 px-3 text-right">Active Base</th>
                  <th className="py-2.5 px-3 text-right">Churned</th>
                  <th className="py-2.5 px-3 text-right">Quality Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E3452]/50">
                {datasetVersions.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                      {new Date(v.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {v.fileName}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-[#12305A] text-slate-700 dark:text-slate-300">
                        {v.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono-tabular font-bold text-slate-900 dark:text-white">
                      {v.rowCount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono-tabular text-emerald-600 dark:text-emerald-400">
                      {v.activeCount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono-tabular text-[#7A0C1E] dark:text-[#E5C566]">
                      {v.churnedCount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono-tabular font-bold text-[#C9A227]">
                      {v.qualityScore}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Column Mapping Modal */}
      {showMappingModal && mappings && parsedFile && (
        <ColumnMappingModal
          fileName={parsedFile.fileName}
          totalRows={parsedFile.totalRows}
          mappings={mappings}
          onConfirm={handleConfirmMapping}
          onCancel={() => setShowMappingModal(false)}
        />
      )}
    </div>
  );
};
