import React, { useState, useMemo } from 'react';
import {
  Users,
  Target,
  Download,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Sliders
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ScoredCustomer } from '../../types/schema';
import {
  buildRuleBasedSegments,
  buildKMeansSegments,
  CustomerSegmentSummary
} from '../../services/segmentation';
import { exportSafeCsv } from '../../services/reportExport';

interface SegmentationViewProps {
  scoredCustomers: ScoredCustomer[];
  onSelectSegmentCohort: (customerIds: string[], segmentName: string) => void;
  onCreateCampaignFromSegment: (segment: CustomerSegmentSummary) => void;
}

export const SegmentationView: React.FC<SegmentationViewProps> = ({
  scoredCustomers,
  onSelectSegmentCohort,
  onCreateCampaignFromSegment
}) => {
  const [lens, setLens] = useState<'Rule-Based' | 'K-Means Cluster'>('Rule-Based');
  const [kClusters, setKClusters] = useState<number>(4);

  const ruleSegments = useMemo(() => {
    return buildRuleBasedSegments(scoredCustomers);
  }, [scoredCustomers]);

  const kMeansSegments = useMemo(() => {
    return buildKMeansSegments(scoredCustomers, kClusters);
  }, [scoredCustomers, kClusters]);

  const activeSegments = lens === 'Rule-Based' ? ruleSegments : kMeansSegments;

  // Bubble chart data: x = averageProbabilityPercent, y = average monthly value, z = customerCount
  const bubbleData = useMemo(() => {
    return activeSegments.map(s => {
      const avgSpend = s.customerCount > 0 ? +(s.monthlyRecurringRevenueGbp / s.customerCount).toFixed(2) : 0;
      return {
        name: s.name,
        x: s.averageProbabilityPercent,
        y: avgSpend,
        z: s.customerCount,
        churnRate: s.churnRatePercent,
        riskMrr: s.monthlyRevenueAtRiskGbp,
        segmentObj: s
      };
    });
  }, [activeSegments]);

  const handleExportSegment = (s: CustomerSegmentSummary) => {
    const members = scoredCustomers.filter(c => s.customerIds.includes(c.id));
    const rows = members.map(c => ({
      'Customer ID': c.id,
      Segment: c.record.customerSegment,
      Plan: c.record.planName,
      'Risk Tier': c.riskTier,
      'Churn Probability %': +(c.churnProbability * 100).toFixed(1),
      'Monthly Charge (£)': c.record.monthlyChargeGbp,
      'Revenue at Risk (£)': c.expectedMonthlyRevenueAtRisk,
      'Primary Driver': c.topDrivers[0]?.plainEnglish || ''
    }));
    exportSafeCsv(rows, `BritConnect_Segment_${s.name.replace(/[^a-z0-9]/gi, '_')}`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header with Lens Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-slate-900 dark:text-white">
            Customer Segmentation & Cohort Analysis
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Segment your customer base using heuristic business rules or unsupervised K-Means clustering.
          </p>
        </div>

        {/* Lens segmented control */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-lg">
            <button
              onClick={() => setLens('Rule-Based')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                lens === 'Rule-Based'
                  ? 'bg-white dark:bg-[#12305A] text-[#0B1F3A] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Rule-Based Value / Risk
            </button>
            <button
              onClick={() => setLens('K-Means Cluster')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                lens === 'K-Means Cluster'
                  ? 'bg-white dark:bg-[#12305A] text-[#0B1F3A] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              K-Means Clustering
            </button>
          </div>

          {lens === 'K-Means Cluster' && (
            <div className="flex items-center gap-1.5 text-xs bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 font-medium">Clusters (k):</span>
              <select
                value={kClusters}
                onChange={(e) => setKClusters(Number(e.target.value))}
                className="font-bold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value={3}>3</option>
                <option value={4}>4 (Optimal)</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bubble Matrix: Value (Y) vs Churn Probability (X) */}
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Segment Value vs. Churn Propensity Landscape
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              X = Average Churn Probability (%) · Y = Average Monthly Subscription (£) · Bubble Size = Customer Base
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono-tabular">
            {activeSegments.length} cohorts identified
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <XAxis
                type="number"
                dataKey="x"
                name="Churn Probability"
                unit="%"
                domain={[0, 100]}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Avg Monthly Value"
                unit="£"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="z" range={[80, 550]} name="Customers" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-[#0B1F3A] border border-slate-200 dark:border-[#1E3452] p-3 rounded-lg shadow-lg text-xs space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">{data.name}</p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Size: <strong className="font-mono-tabular">{data.z.toLocaleString()}</strong> customers
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Avg Churn Propensity: <strong className="font-mono-tabular">{data.x}%</strong>
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Avg Monthly Spend: <strong className="font-mono-tabular">£{data.y}</strong>
                      </p>
                      <p className="text-[#C9A227] font-semibold">
                        Monthly Risk: £{data.riskMrr.toLocaleString()}
                      </p>
                    </div>
                  );
                }}
              />
              <Scatter name="Segments" data={bubbleData}>
                {bubbleData.map((entry, index) => {
                  let fill = '#0B1F3A';
                  if (entry.x >= 60) fill = '#7A0C1E';
                  else if (entry.x >= 40) fill = '#C9A227';
                  else if (entry.y >= 50) fill = '#1D4C8F';
                  return <Cell key={`cell-${index}`} fill={fill} fillOpacity={0.85} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeSegments.map((seg) => {
          const isHighRisk = seg.averageProbabilityPercent >= 50;

          return (
            <div
              key={seg.id}
              className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#C9A227] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {seg.name}
                  </h3>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 font-mono-tabular ${
                      isHighRisk
                        ? 'bg-red-100 text-[#7A0C1E] dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-[#12305A] dark:text-slate-300'
                    }`}
                  >
                    {seg.averageProbabilityPercent}% risk
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-[#1E3452]">
                  <div>
                    <span className="text-[10px] text-slate-400">Customers</span>
                    <p className="font-mono-tabular font-bold text-slate-800 dark:text-slate-200">
                      {seg.customerCount.toLocaleString()} ({seg.percentageOfBase}%)
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Monthly Spend</span>
                    <p className="font-mono-tabular font-bold text-slate-800 dark:text-slate-200">
                      £{seg.monthlyRecurringRevenueGbp.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Revenue at Risk</span>
                    <p className="font-mono-tabular font-bold text-[#C9A227]">
                      £{seg.monthlyRevenueAtRiskGbp.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Avg Tenure</span>
                    <p className="font-mono-tabular font-bold text-slate-800 dark:text-slate-200">
                      {seg.averageTenureMonths}m
                    </p>
                  </div>
                </div>

                {/* Defining Traits */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Defining Traits
                  </span>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    {seg.definingTraits.map((t, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="text-[#C9A227]">•</span>
                        <span className="truncate">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Strategy */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#12305A]/40 p-2.5 rounded-lg border border-slate-100 dark:border-[#1E3452]">
                  <strong className="text-slate-700 dark:text-slate-200 block mb-0.5">Recommended Strategy:</strong>
                  {seg.recommendedStrategy}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-[#1E3452] flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectSegmentCohort(seg.customerIds, seg.name)}
                  className="text-xs font-semibold text-[#1D4C8F] dark:text-[#E5C566] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Customers</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExportSegment(seg)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-[#12305A] transition-colors cursor-pointer"
                    title="Export segment list as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onCreateCampaignFromSegment(seg)}
                    className="p-1.5 text-[#C9A227] hover:text-[#E5C566] rounded hover:bg-[#C9A227]/10 transition-colors cursor-pointer"
                    title="Create campaign targeting this segment"
                  >
                    <Target className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
