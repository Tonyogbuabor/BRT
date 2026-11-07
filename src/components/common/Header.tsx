import React from 'react';
import {
  Upload,
  Moon,
  Sun,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Search,
  Bot
} from 'lucide-react';
import { CustomerRecord, ModelCard } from '../../types/schema';

interface HeaderProps {
  recordsCount: number;
  lastUpdated: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenUpload: () => void;
  onOpenAssistant: () => void;
  activeModel: ModelCard | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLoadDemoData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  recordsCount,
  lastUpdated,
  isDark,
  onToggleTheme,
  onOpenUpload,
  onOpenAssistant,
  activeModel,
  searchQuery,
  onSearchChange,
  onLoadDemoData
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B1F3A] border-b border-[#1E3452] text-white flex items-center justify-between px-6 gap-8 select-none">
      {/* Zone 1: Brand wordmark (single line, elegant serif accent) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#8F7218] flex items-center justify-center font-bold text-[#0B1F3A] text-lg shadow-sm">
          B
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif-heading text-xl font-bold tracking-tight text-white whitespace-nowrap">
            BritConnect
          </span>
          <span className="text-xs text-[#E5C566] font-medium tracking-wide whitespace-nowrap">
            Churn Intelligence
          </span>
        </div>
      </div>

      {/* Zone 2: Search & Live Status Metadata */}
      <div className="flex-1 max-w-xl hidden md:flex items-center gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by Customer ID (e.g. BC-10042), City, or Plan..."
            className="w-full bg-[#12305A]/70 border border-[#1E3452] rounded-lg pl-10 pr-4 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#C9A227] transition-colors"
          />
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300 whitespace-nowrap shrink-0">
          <span className="font-mono-tabular font-medium text-[#E5C566]">
            {recordsCount.toLocaleString()}
          </span>
          <span>customers</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{lastUpdated || 'No data'}</span>
        </div>
      </div>

      {/* Zone 3: Actions (Upload, Demo, Assistant, Theme) */}
      <div className="flex items-center gap-2.5 shrink-0">
        {recordsCount === 0 && (
          <button
            onClick={onLoadDemoData}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-[#C9A227] hover:bg-[#E5C566] rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Load Demo (1.2k Base)</span>
          </button>
        )}

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1D4C8F] hover:bg-[#12305A] border border-[#1E3452] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          title="Upload or import dataset (.xlsx, .csv, .json)"
        >
          <Upload className="w-3.5 h-3.5 text-[#E5C566]" />
          <span>Upload Data</span>
        </button>

        <button
          onClick={onOpenAssistant}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E5C566] bg-[#12305A] hover:bg-[#1D4C8F] border border-[#C9A227]/40 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          title="Open Natural-Language Analytics AI Chatbot"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-300 hover:text-white hover:bg-[#12305A] rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-[#E5C566]" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
