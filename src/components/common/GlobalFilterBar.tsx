import React, { useMemo } from 'react';
import { Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { CustomerRecord, FilterState } from '../../types/schema';

interface GlobalFilterBarProps {
  records: CustomerRecord[];
  filteredCount: number;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  records,
  filteredCount,
  filters,
  onFilterChange,
  onResetFilters
}) => {
  // Extract unique distinct options from the actual dataset
  const options = useMemo(() => {
    const segments = new Set<string>();
    const serviceTypes = new Set<string>();
    const plans = new Set<string>();
    const nations = new Set<string>();
    const channels = new Set<string>();
    const contractTypes = new Set<string>();
    const ageBands = new Set<string>();
    const genders = new Set<string>();

    for (const r of records) {
      if (r.customerSegment) segments.add(r.customerSegment);
      if (r.serviceType) serviceTypes.add(r.serviceType);
      if (r.planName) plans.add(r.planName);
      if (r.ukNation) nations.add(r.ukNation);
      if (r.acquisitionChannel) channels.add(r.acquisitionChannel);
      if (r.contractType) contractTypes.add(r.contractType);
      if (r.ageBand) ageBands.add(r.ageBand);
      if (r.gender) genders.add(r.gender);
    }

    return {
      segments: Array.from(segments).sort(),
      serviceTypes: Array.from(serviceTypes).sort(),
      plans: Array.from(plans).sort(),
      nations: Array.from(nations).sort(),
      channels: Array.from(channels).sort(),
      contractTypes: Array.from(contractTypes).sort(),
      ageBands: Array.from(ageBands).sort(),
      genders: Array.from(genders).sort()
    };
  }, [records]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.customerSegment) count++;
    if (filters.serviceType) count++;
    if (filters.planName) count++;
    if (filters.ukNation) count++;
    if (filters.acquisitionChannel) count++;
    if (filters.contractType) count++;
    if (filters.ageBand) count++;
    if (filters.gender) count++;
    if (filters.riskTier) count++;
    if (filters.joinDateFrom) count++;
    if (filters.joinDateTo) count++;
    return count;
  }, [filters]);

  const handleSelect = (key: keyof FilterState, val: string) => {
    onFilterChange({
      ...filters,
      [key]: val
    });
  };

  return (
    <div className="bg-white dark:bg-[#0D1C30] border-b border-slate-200 dark:border-[#1E3452] px-6 py-2.5 text-xs select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active Record Counter */}
        <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#C9A227]" />
          <span className="font-semibold text-slate-900 dark:text-white">Cohort Scope:</span>
          <span className="font-mono-tabular font-bold text-[#1D4C8F] dark:text-[#E5C566]">
            {filteredCount.toLocaleString()}
          </span>
          <span className="text-slate-400">/ {records.length.toLocaleString()} customers</span>
          {activeFiltersCount > 0 && (
            <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-[#12305A] px-2 py-0.5 rounded">
              {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Center: Filter Selects */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Risk Tier */}
          <select
            value={filters.riskTier}
            onChange={(e) => handleSelect('riskTier', e.target.value)}
            className="bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#C9A227] cursor-pointer"
          >
            <option value="">All Risk Tiers</option>
            <option value="Critical">Critical (≥70%)</option>
            <option value="High">High (50-69%)</option>
            <option value="Medium">Medium (30-49%)</option>
            <option value="Low">Low (&lt;30%)</option>
          </select>

          {/* Customer Segment */}
          <select
            value={filters.customerSegment}
            onChange={(e) => handleSelect('customerSegment', e.target.value)}
            className="bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#C9A227] cursor-pointer"
          >
            <option value="">All Segments</option>
            {options.segments.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Service Type */}
          <select
            value={filters.serviceType}
            onChange={(e) => handleSelect('serviceType', e.target.value)}
            className="bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#C9A227] cursor-pointer"
          >
            <option value="">All Services</option>
            {options.serviceTypes.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Contract Type */}
          <select
            value={filters.contractType}
            onChange={(e) => handleSelect('contractType', e.target.value)}
            className="bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#C9A227] cursor-pointer"
          >
            <option value="">All Contracts</option>
            {options.contractTypes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* UK Nation */}
          <select
            value={filters.ukNation}
            onChange={(e) => handleSelect('ukNation', e.target.value)}
            className="bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#C9A227] cursor-pointer"
          >
            <option value="">All UK Nations</option>
            {options.nations.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          {/* Acquisition Channel */}
          <select
            value={filters.acquisitionChannel}
            onChange={(e) => handleSelect('acquisitionChannel', e.target.value)}
            className="bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#C9A227] cursor-pointer"
          >
            <option value="">All Channels</option>
            {options.channels.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Right: Reset Button */}
        {activeFiltersCount > 0 && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[#C9A227]" />
            <span>Reset filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
