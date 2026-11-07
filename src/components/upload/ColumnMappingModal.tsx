import React, { useState } from 'react';
import { X, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { AUTHORITATIVE_COLUMNS } from '../../services/schemaRegistry';
import { ColumnMappingItem } from '../../services/dataIngestion';

interface ColumnMappingModalProps {
  fileName: string;
  totalRows: number;
  mappings: ColumnMappingItem[];
  onConfirm: (finalMapping: Record<string, string>) => void;
  onCancel: () => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  fileName,
  totalRows,
  mappings,
  onConfirm,
  onCancel
}) => {
  // State: rawHeader -> schemaKey (or '' for unmapped)
  const [selectedMapping, setSelectedMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const m of mappings) {
      initial[m.rawHeader] = m.mappedKey || '';
    }
    return initial;
  });

  const handleChange = (rawHeader: string, newKey: string) => {
    setSelectedMapping(prev => ({
      ...prev,
      [rawHeader]: newKey
    }));
  };

  const mappedKeys = new Set(Object.values(selectedMapping).filter(Boolean));
  const hasCustomerId = mappedKeys.has('id');
  const hasTarget = mappedKeys.has('churnFlag') || mappedKeys.has('churnStatus');

  const handleCommit = () => {
    onConfirm(selectedMapping);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E3452] flex items-center justify-between bg-slate-50 dark:bg-[#0B1F3A]">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Verify Schema Column Mapping
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              File: <span className="font-semibold text-slate-700 dark:text-slate-300">{fileName}</span> ({totalRows.toLocaleString()} rows)
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requirements status notice */}
        <div className="px-6 py-3 bg-[#12305A]/10 dark:bg-[#12305A]/30 border-b border-slate-200 dark:border-[#1E3452] flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              {hasCustomerId ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              <span className={hasCustomerId ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                Customer ID: {hasCustomerId ? 'Mapped' : 'Required'}
              </span>
            </span>

            <span className="flex items-center gap-1.5 font-medium">
              {hasTarget ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              <span className={hasTarget ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                Churn Target (Flag / Status): {hasTarget ? 'Mapped' : 'Optional (Score-only mode if omitted)'}
              </span>
            </span>
          </div>

          <div className="text-slate-500 text-[11px]">
            {mappedKeys.size} of {AUTHORITATIVE_COLUMNS.length} authoritative columns mapped
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1E3452] text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Uploaded Header in File</th>
                <th className="py-2.5 px-3 text-center">Match Confidence</th>
                <th className="py-2.5 px-3">Map to BritConnect Schema Column</th>
                <th className="py-2.5 px-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3452]/50">
              {mappings.map((m) => {
                const currentVal = selectedMapping[m.rawHeader] || '';
                const matchedCol = AUTHORITATIVE_COLUMNS.find(c => c.key === currentVal);
                const isAutoMatched = m.confidence >= 0.75;

                return (
                  <tr key={m.rawHeader} className="hover:bg-slate-50 dark:hover:bg-[#12305A]/30">
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {m.rawHeader}
                    </td>

                    <td className="py-2 px-3 text-center">
                      {m.confidence >= 0.95 ? (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Exact ({(m.confidence * 100).toFixed(0)}%)
                        </span>
                      ) : m.confidence >= 0.70 ? (
                        <span className="text-[11px] font-medium text-[#C9A227]">
                          Fuzzy ({(m.confidence * 100).toFixed(0)}%)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Unmapped
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3">
                      <select
                        value={currentVal}
                        onChange={(e) => handleChange(m.rawHeader, e.target.value)}
                        className="w-full max-w-xs bg-white dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C9A227] cursor-pointer"
                      >
                        <option value="">-- Do Not Map (Keep as Extra Attribute) --</option>
                        {AUTHORITATIVE_COLUMNS.map((col) => (
                          <option key={col.key} value={col.key}>
                            #{col.index} {col.name} {col.requiredForTraining ? '*' : ''}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                      {matchedCol?.type || 'Extra Text'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-[#1E3452] bg-slate-50 dark:bg-[#0B1F3A] flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleCommit}
            disabled={!hasCustomerId}
            className={`px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              hasCustomerId
                ? 'bg-[#0B1F3A] hover:bg-[#12305A] text-white shadow-sm'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>Confirm Column Mapping & Ingest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
