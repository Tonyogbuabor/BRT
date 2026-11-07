import React from 'react';
import {
  LayoutDashboard,
  Upload,
  CheckCircle2,
  TrendingDown,
  Activity,
  Users,
  Search,
  Target,
  Sparkles,
  Cpu,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Bot,
  Calculator,
  FileSpreadsheet
} from 'lucide-react';

export type NavPage =
  | 'overview'
  | 'upload'
  | 'quality'
  | 'dashboard'
  | 'executive-summary'
  | 'risk-calculator'
  | 'drivers'
  | 'segmentation'
  | 'scoring'
  | 'campaigns'
  | 'retention'
  | 'assistant'
  | 'models'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hasData: boolean;
  hasModel: boolean;
}

interface NavItem {
  id: NavPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresData?: boolean;
  requiresModel?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  hasData,
  hasModel
}) => {
  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Workflow',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'upload', label: 'Upload & Data', icon: Upload },
        { id: 'quality', label: 'Data Quality', icon: CheckCircle2, requiresData: true }
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: TrendingDown, requiresData: true },
        { id: 'executive-summary', label: 'Executive Summary', icon: FileSpreadsheet, requiresData: true },
        { id: 'risk-calculator', label: 'Risk Calculator', icon: Calculator, requiresData: true },
        { id: 'drivers', label: 'Churn Drivers', icon: Activity, requiresData: true },
        { id: 'segmentation', label: 'Customer Segments', icon: Users, requiresData: true },
        { id: 'scoring', label: 'Customer 360 & Scores', icon: Search, requiresData: true }
      ]
    },
    {
      title: 'Intervention',
      items: [
        { id: 'campaigns', label: 'Campaign Tracker', icon: Target, requiresData: true },
        { id: 'retention', label: 'Action Centre (AI)', icon: Sparkles, requiresData: true },
        { id: 'assistant', label: 'AI Analytics Chat', icon: Bot, requiresData: true }
      ]
    },
    {
      title: 'Governance',
      items: [
        { id: 'models', label: 'Model Studio', icon: Cpu, requiresData: true },
        { id: 'reports', label: 'Reports & Exports', icon: FileText, requiresData: true },
        { id: 'settings', label: 'Settings & Diagnostics', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`relative z-20 shrink-0 bg-[#0B1F3A] border-r border-[#1E3452] flex flex-col transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {sec.title}
              </div>
            )}
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              const isDisabled = (item.requiresData && !hasData) || (item.requiresModel && !hasModel);

              return (
                <button
                  key={item.id}
                  onClick={() => !isDisabled && onSelectPage(item.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all relative group cursor-pointer ${
                    isActive
                      ? 'bg-[#12305A] text-white font-semibold'
                      : isDisabled
                      ? 'text-slate-500 opacity-40 cursor-not-allowed'
                      : 'text-slate-300 hover:text-white hover:bg-[#12305A]/50'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Gold active edge indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#C9A227] rounded-r" />
                  )}

                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#E5C566]' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />

                  {!collapsed && (
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-[#1E3452] flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>In-Browser Private ML</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#12305A] rounded-lg transition-colors cursor-pointer ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
