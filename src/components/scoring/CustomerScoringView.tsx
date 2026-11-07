import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ScoredCustomer, RiskTier } from '../../types/schema';
import { exportCustomerRiskListXlsx, exportSafeCsv } from '../../services/reportExport';

interface CustomerScoringViewProps {
  scoredCustomers: ScoredCustomer[];
  onOpenCustomer360: (c: ScoredCustomer) => void;
  onGeneratePlan: (c: ScoredCustomer) => void;
}

export const CustomerScoringView: React.FC<CustomerScoringViewProps> = ({
  scoredCustomers,
  onOpenCustomer360,
  onGeneratePlan
}) => {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [sortField, setSortField] = useState<keyof ScoredCustomer | 'monthlyCharge'>('churnProbability');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  // Filter
  const filtered = useMemo(() => {
    return scoredCustomers.filter(c => {
      if (selectedTier !== 'All' && c.riskTier !== selectedTier) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchId = c.id.toLowerCase().includes(q);
        const matchCity = c.record.city?.toLowerCase().includes(q);
        const matchPlan = c.record.planName?.toLowerCase().includes(q);
        if (!matchId && !matchCity && !matchPlan) return false;
      }
      return true;
    });
  }, [scoredCustomers, selectedTier, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField as keyof ScoredCustomer];
      let valB: any = b[sortField as keyof ScoredCustomer];

      if (sortField === 'monthlyCharge') {
        valA = a.effectiveMonthlyCharge;
        valB = b.effectiveMonthlyCharge;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  const handleSort = (field: keyof ScoredCustomer | 'monthlyCharge') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportXlsx = () => {
    exportCustomerRiskListXlsx(sorted, `Tier: ${selectedTier}, Search: "${search}"`);
  };

  const handleExportCsv = () => {
    const rows = sorted.map(c => ({
      'Customer ID': c.id,
      'Risk Tier': c.riskTier,
      'Churn Probability %': +(c.churnProbability * 100).toFixed(1),
      'Monthly Charge (£)': c.effectiveMonthlyCharge,
      'Revenue at Risk (£)': c.expectedMonthlyRevenueAtRisk,
      '12M Expected Loss (£)': c.expectedLoss12M,
      'Primary Driver': c.topDrivers[0]?.plainEnglish || '',
      Segment: c.record.customerSegment,
      Plan: c.record.planName,
      City: c.record.city
    }));
    exportSafeCsv(rows, `BritConnect_Scored_Customers_${new Date().toISOString().slice(0, 10)}`);
  };

  // Dynamic Risk Tier Statistics
  const tierStats = useMemo(() => {
    const total = scoredCustomers.length || 1;
    const critical = scoredCustomers.filter(c => c.riskTier === 'Critical');
    const high = scoredCustomers.filter(c => c.riskTier === 'High');
    const medium = scoredCustomers.filter(c => c.riskTier === 'Medium');
    const low = scoredCustomers.filter(c => c.riskTier === 'Low');

    return {
      critical: {
        count: critical.length,
        share: +((critical.length / total) * 100).toFixed(1),
        monthlyRisk: +critical.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2),
        avgProb: critical.length > 0 ? +((critical.reduce((acc, c) => acc + c.churnProbability, 0) / critical.length) * 100).toFixed(1) : 0
      },
      high: {
        count: high.length,
        share: +((high.length / total) * 100).toFixed(1),
        monthlyRisk: +high.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2),
        avgProb: high.length > 0 ? +((high.reduce((acc, c) => acc + c.churnProbability, 0) / high.length) * 100).toFixed(1) : 0
      },
      medium: {
        count: medium.length,
        share: +((medium.length / total) * 100).toFixed(1),
        monthlyRisk: +medium.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2),
        avgProb: medium.length > 0 ? +((medium.reduce((acc, c) => acc + c.churnProbability, 0) / medium.length) * 100).toFixed(1) : 0
      },
      low: {
        count: low.length,
        share: +((low.length / total) * 100).toFixed(1),
        monthlyRisk: +low.reduce((acc, c) => acc + c.expectedMonthlyRevenueAtRisk, 0).toFixed(2),
        avgProb: low.length > 0 ? +((low.reduce((acc, c) => acc + c.churnProbability, 0) / low.length) * 100).toFixed(1) : 0
      }
    };
  }, [scoredCustomers]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Exports */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-slate-900 dark:text-white">
            Customer Risk Scoring & Customer 360 Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Every active customer scored with in-browser machine learning, ranked by churn probability and exposed revenue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportXlsx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Export Scored List (XLSX)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (CSV)</span>
          </button>
        </div>
      </div>

      {/* Interactive Risk Tier Tracker Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Critical */}
        <div
          onClick={() => { setSelectedTier(selectedTier === 'Critical' ? 'All' : 'Critical'); setPage(1); }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedTier === 'Critical'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-400 shadow-xs'
              : 'bg-white dark:bg-[#0D1C30] border-slate-200 dark:border-[#1E3452] hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#4D0612] dark:text-red-400">Critical Risk (≥70%)</span>
            <span className="text-[10px] text-slate-400">{tierStats.critical.share}%</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#4D0612] dark:text-red-300">
              {tierStats.critical.count.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">accts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>£{tierStats.critical.monthlyRisk.toLocaleString()}/mo</span>
            <span className="font-mono-tabular font-medium text-red-600 dark:text-red-400">{tierStats.critical.avgProb}% avg</span>
          </div>
        </div>

        {/* High */}
        <div
          onClick={() => { setSelectedTier(selectedTier === 'High' ? 'All' : 'High'); setPage(1); }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedTier === 'High'
              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 ring-2 ring-orange-400 shadow-xs'
              : 'bg-white dark:bg-[#0D1C30] border-slate-200 dark:border-[#1E3452] hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#A3152B] dark:text-orange-400">High Risk (50–69%)</span>
            <span className="text-[10px] text-slate-400">{tierStats.high.share}%</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#A3152B] dark:text-orange-300">
              {tierStats.high.count.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">accts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>£{tierStats.high.monthlyRisk.toLocaleString()}/mo</span>
            <span className="font-mono-tabular font-medium text-orange-600 dark:text-orange-400">{tierStats.high.avgProb}% avg</span>
          </div>
        </div>

        {/* Medium */}
        <div
          onClick={() => { setSelectedTier(selectedTier === 'Medium' ? 'All' : 'Medium'); setPage(1); }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedTier === 'Medium'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-[#C9A227] ring-2 ring-[#C9A227]/40 shadow-xs'
              : 'bg-white dark:bg-[#0D1C30] border-slate-200 dark:border-[#1E3452] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C9A227] dark:text-[#E5C566]">Medium Risk (30–49%)</span>
            <span className="text-[10px] text-slate-400">{tierStats.medium.share}%</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#C9A227] dark:text-[#E5C566]">
              {tierStats.medium.count.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">accts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>£{tierStats.medium.monthlyRisk.toLocaleString()}/mo</span>
            <span className="font-mono-tabular font-medium text-[#C9A227] dark:text-[#E5C566]">{tierStats.medium.avgProb}% avg</span>
          </div>
        </div>

        {/* Low */}
        <div
          onClick={() => { setSelectedTier(selectedTier === 'Low' ? 'All' : 'Low'); setPage(1); }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedTier === 'Low'
              ? 'bg-slate-100 dark:bg-[#12305A] border-[#0B1F3A] dark:border-white ring-2 ring-[#0B1F3A]/30 shadow-xs'
              : 'bg-white dark:bg-[#0D1C30] border-slate-200 dark:border-[#1E3452] hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#0B1F3A] dark:text-white">Low Risk (&lt;30%)</span>
            <span className="text-[10px] text-slate-400">{tierStats.low.share}%</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono-tabular text-[#0B1F3A] dark:text-white">
              {tierStats.low.count.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">accts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>£{tierStats.low.monthlyRisk.toLocaleString()}/mo</span>
            <span className="font-mono-tabular font-medium text-emerald-600 dark:text-emerald-400">{tierStats.low.avgProb}% avg</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Tier Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((tier) => (
            <button
              key={tier}
              onClick={() => { setSelectedTier(tier); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedTier === tier
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#12305A]'
              }`}
            >
              {tier} {tier !== 'All' ? `(${scoredCustomers.filter(c => c.riskTier === tier).length})` : `(${scoredCustomers.length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search ID, City, or Plan..."
            className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#C9A227]"
          />
        </div>
      </div>

      {/* Scored Customers Table */}
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1E3452] text-slate-500 font-semibold bg-slate-50 dark:bg-[#0B1F3A]">
                <th className="py-2.5 px-3">
                  <button onClick={() => handleSort('id')} className="flex items-center gap-1 cursor-pointer">
                    <span>Customer ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Segment</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Plan Name</th>
                <th className="py-2.5 px-3 text-right">
                  <button onClick={() => handleSort('monthlyCharge')} className="flex items-center gap-1 ml-auto cursor-pointer">
                    <span>Bill (£)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <button onClick={() => handleSort('churnProbability')} className="flex items-center gap-1 ml-auto cursor-pointer">
                    <span>Churn Prob</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-center">Risk Tier</th>
                <th className="py-2.5 px-3 text-right">
                  <button onClick={() => handleSort('expectedMonthlyRevenueAtRisk')} className="flex items-center gap-1 ml-auto cursor-pointer">
                    <span>Revenue at Risk</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Primary Risk Driver</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3452]/50">
              {currentPageRows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-[#12305A]/30 transition-colors">
                  <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {c.id}
                  </td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                    {c.record.customerSegment}
                  </td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                    {c.record.city}
                  </td>
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-200 font-medium">
                    {c.record.planName}
                  </td>
                  <td className="py-2 px-3 text-right font-mono-tabular text-slate-900 dark:text-white">
                    £{c.effectiveMonthlyCharge.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono-tabular font-bold">
                    <span
                      className={
                        c.churnProbability >= 0.70
                          ? 'text-[#7A0C1E]'
                          : c.churnProbability >= 0.50
                          ? 'text-[#A3152B]'
                          : c.churnProbability >= 0.30
                          ? 'text-[#C9A227]'
                          : 'text-emerald-600'
                      }
                    >
                      {(c.churnProbability * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.riskTier === 'Critical'
                          ? 'bg-red-100 text-[#4D0612] dark:bg-red-950/80 dark:text-red-200'
                          : c.riskTier === 'High'
                          ? 'bg-red-50 text-[#7A0C1E] dark:bg-red-900/40 dark:text-red-300'
                          : c.riskTier === 'Medium'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}
                    >
                      {c.riskTier}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono-tabular font-bold text-[#C9A227]">
                    £{c.expectedMonthlyRevenueAtRisk.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={c.topDrivers[0]?.plainEnglish}>
                    {c.topDrivers[0]?.plainEnglish || 'Standard retention renewal'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onOpenCustomer360(c)}
                        className="p-1 text-[#1D4C8F] hover:bg-slate-100 dark:hover:bg-[#12305A] rounded transition-colors cursor-pointer"
                        title="Open Customer 360 & What-If Simulator"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onGeneratePlan(c)}
                        className="p-1 text-[#C9A227] hover:bg-[#C9A227]/10 rounded transition-colors cursor-pointer"
                        title="Generate Personalised AI Retention Plan"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-[#1E3452] flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">{((page - 1) * pageSize) + 1}</strong> to{' '}
            <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">{Math.min(sorted.length, page * pageSize)}</strong> of{' '}
            <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">{sorted.length.toLocaleString()}</strong> active accounts
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1 rounded border border-slate-200 dark:border-[#1E3452] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono-tabular">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1 rounded border border-slate-200 dark:border-[#1E3452] disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
