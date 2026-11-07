import React, { useState, useRef } from 'react';
import { Download, Table, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ChartCardProps {
  title: string;
  subtitle: string;
  footnote?: string;
  children: React.ReactNode;
  tableData?: { label: string; value: string | number; secondary?: string | number }[];
  tableHeaders?: [string, string, string?];
  onExplainChart?: () => void;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  footnote = 'Source: BritConnect Active Billing & Telemetry Database',
  children,
  tableData,
  tableHeaders = ['Category', 'Observed Value', 'Benchmark / Share'],
  onExplainChart,
  className = ''
}) => {
  const [showTable, setShowTable] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_chart.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export chart PNG', err);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between ${
        isFullScreen ? 'fixed inset-4 z-50 overflow-auto bg-white dark:bg-[#0D1C30]' : ''
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {onExplainChart && (
            <button
              onClick={onExplainChart}
              className="p-1 hover:text-[#C9A227] hover:bg-slate-100 dark:hover:bg-[#12305A] rounded transition-colors cursor-pointer"
              title="Explain chart with AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          {tableData && (
            <button
              onClick={() => setShowTable(!showTable)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                showTable ? 'text-[#1D4C8F] bg-slate-100 dark:bg-[#12305A]' : 'hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12305A]'
              }`}
              title="View underlying data table"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleDownloadPng}
            className="p-1 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12305A] rounded transition-colors cursor-pointer"
            title="Download Chart as PNG image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12305A] rounded transition-colors cursor-pointer"
            title={isFullScreen ? 'Exit full screen' : 'Expand full screen'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body: Chart or Table */}
      <div className="flex-1 min-h-[220px] flex items-center justify-center">
        {showTable && tableData ? (
          <div className="w-full overflow-x-auto max-h-[260px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E3452] text-slate-500 font-semibold">
                  <th className="py-2 px-2.5">{tableHeaders[0]}</th>
                  <th className="py-2 px-2.5 text-right">{tableHeaders[1]}</th>
                  {tableHeaders[2] && <th className="py-2 px-2.5 text-right">{tableHeaders[2]}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E3452]/50">
                {tableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#12305A]/40">
                    <td className="py-1.5 px-2.5 font-medium text-slate-800 dark:text-slate-200">{row.label}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono-tabular text-slate-900 dark:text-white">{row.value}</td>
                    {tableHeaders[2] && (
                      <td className="py-1.5 px-2.5 text-right font-mono-tabular text-slate-500">{row.secondary ?? '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col justify-center">
            {children}
          </div>
        )}
      </div>

      {/* Footnote */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#1E3452] text-[10px] text-slate-400 flex items-center justify-between">
        <span>{footnote}</span>
        <span className="font-mono-tabular">as at 07/11/2026</span>
      </div>
    </div>
  );
};
