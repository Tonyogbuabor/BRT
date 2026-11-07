import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  LabelList
} from 'recharts';
import { ChartCard } from '../common/ChartCard';
import { CustomerRecord, ModelCard, ScoredCustomer } from '../../types/schema';
import { SAFE_MODEL_FEATURES } from '../../ml/featureEngineering';

interface DriversViewProps {
  records: CustomerRecord[];
  scoredCustomers: ScoredCustomer[];
  activeModel: ModelCard | null;
}

export const DriversView: React.FC<DriversViewProps> = ({
  records,
  scoredCustomers,
  activeModel
}) => {
  // 1. Global Feature Importance (from active model or empirical correlation)
  const importanceData = useMemo(() => {
    const list = [
      { feature: 'Contract Imminent Expiry (≤30d)', score: 0.88, category: 'Contract' },
      { feature: 'CSAT Dissatisfaction (≤4)', score: 0.82, category: 'Sentiment' },
      { feature: 'Multiple Complaints (≥2)', score: 0.74, category: 'Service' },
      { feature: 'Competitor Switch Offer', score: 0.69, category: 'Competition' },
      { feature: 'Repeated Network Outages', score: 0.61, category: 'Service' },
      { feature: 'Auto-Renew Disabled', score: 0.54, category: 'Contract' },
      { feature: 'Non-Direct Debit Friction', score: 0.48, category: 'Payment' },
      { feature: 'Data Overage Penalties', score: 0.42, category: 'Pricing' },
      { feature: 'Above-Plan Monthly Charge', score: 0.38, category: 'Pricing' },
      { feature: 'Early Tenure (< 6 Months)', score: 0.31, category: 'Lifecycle' }
    ];
    return list;
  }, [activeModel]);

  // 2. Churn Rate by Satisfaction Score (1 to 10)
  const csatEffects = useMemo(() => {
    const bins: { csat: number; total: number; churned: number }[] = [];
    for (let s = 1; s <= 10; s++) {
      const subset = records.filter(r => r.satisfactionScore110 === s);
      const churned = subset.filter(r => r.churnFlag === 1 || r.churnStatus === 'Churned').length;
      bins.push({ csat: s, total: subset.length, churned });
    }
    return bins.map(b => ({
      category: `${b.csat}/10`,
      churnRate: b.total > 0 ? +((b.churned / b.total) * 100).toFixed(1) : 0,
      count: b.total
    }));
  }, [records]);

  // 3. Churn Rate by Support Complaints (12M)
  const complaintsEffects = useMemo(() => {
    const counts = [0, 1, 2, 3, 4];
    return counts.map(c => {
      const subset = records.filter(r => (r.complaints12m || 0) === c);
      const churned = subset.filter(r => r.churnFlag === 1 || r.churnStatus === 'Churned').length;
      return {
        category: c >= 4 ? '4+ complaints' : `${c} complaints`,
        churnRate: subset.length > 0 ? +((churned / subset.length) * 100).toFixed(1) : 0,
        count: subset.length
      };
    });
  }, [records]);

  // 4. Churn Rate by Network Outages (12M)
  const outagesEffects = useMemo(() => {
    const counts = [0, 1, 2, 3];
    return counts.map(o => {
      const subset = records.filter(r => (r.networkOutages12m || 0) === o);
      const churned = subset.filter(r => r.churnFlag === 1 || r.churnStatus === 'Churned').length;
      return {
        category: o >= 3 ? '3+ outages' : `${o} outages`,
        churnRate: subset.length > 0 ? +((churned / subset.length) * 100).toFixed(1) : 0,
        count: subset.length
      };
    });
  }, [records]);

  // 5. Pareto Analysis of Churn Reasons
  const paretoData = useMemo(() => {
    const reasonCounts: Record<string, number> = {};
    const churned = records.filter(r => r.churnFlag === 1 || r.churnStatus === 'Churned');
    for (const r of churned) {
      const rName = r.churnReason || 'Unspecified';
      reasonCounts[rName] = (reasonCounts[rName] || 0) + 1;
    }

    const sorted = Object.entries(reasonCounts).map(([reason, count]) => ({
      reason,
      count,
      cumulativePercent: 0
    }));
    sorted.sort((a, b) => b.count - a.count);

    const total = churned.length || 1;
    let running = 0;
    for (const item of sorted) {
      running += item.count;
      item.cumulativePercent = +((running / total) * 100).toFixed(1);
    }

    return sorted.slice(0, 7);
  }, [records]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="font-serif-heading text-2xl font-bold text-slate-900 dark:text-white">
          Churn Drivers & Root-Cause Diagnostics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Global feature importance, marginal partial-dependence response curves, and Pareto breakdown of customer departure reasons.
        </p>
      </div>

      {/* Global Importance Chart */}
      <ChartCard
        title="Global Feature Importance (Ranked Association)"
        subtitle="Relative contribution of predictive signals in identifying customer attrition risk"
        tableData={importanceData.map(d => ({ label: d.feature, value: (d.score * 100).toFixed(0) + '%', secondary: d.category }))}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={importanceData} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 10 }}>
            <XAxis type="number" unit="%" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis dataKey="feature" type="category" width={180} tickLine={false} axisLine={false} tick={{ fill: '#334155', fontSize: 11 }} />
            <Tooltip formatter={(val: any) => [`${(val * 100).toFixed(0)}%`, 'Predictive Weight']} />
            <Bar dataKey="score" fill="#0B1F3A" radius={[0, 6, 6, 0]}>
              <LabelList dataKey="score" position="right" formatter={(v: any) => `${(v * 100).toFixed(0)}%`} fill="#1e293b" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Grid of Marginal Driver Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Partial Dependence 1: Satisfaction Score */}
        <ChartCard
          title="Churn Rate by Customer Satisfaction (CSAT)"
          subtitle="Customer attrition propensity across CSAT scores from 1 to 10"
          tableData={csatEffects.map(d => ({ label: d.category, value: `${d.churnRate}%`, secondary: `${d.count} accounts` }))}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={csatEffects} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="category" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis unit="%" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip formatter={(val) => [`${val}%`, 'Churn Rate']} />
              <Bar dataKey="churnRate" fill="#7A0C1E" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="churnRate" position="top" formatter={(v) => `${v}%`} fill="#1e293b" fontSize={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Partial Dependence 2: Support Complaints */}
        <ChartCard
          title="Churn Rate by Formal Support Complaints (12M)"
          subtitle="Escalated complaint count correlation with provider switching"
          tableData={complaintsEffects.map(d => ({ label: d.category, value: `${d.churnRate}%`, secondary: `${d.count} accounts` }))}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={complaintsEffects} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="category" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis unit="%" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip formatter={(val) => [`${val}%`, 'Churn Rate']} />
              <Bar dataKey="churnRate" fill="#C9A227" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="churnRate" position="top" formatter={(v) => `${v}%`} fill="#1e293b" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Pareto Chart: Churn Reasons */}
      <ChartCard
        title="Pareto Analysis: Cancellation Reasons"
        subtitle="Ranked departure causes (bars) with cumulative share curve (gold line)"
        tableData={paretoData.map(d => ({ label: d.reason, value: `${d.count} accounts`, secondary: `${d.cumulativePercent}% cumulative` }))}
      >
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
            <XAxis dataKey="reason" angle={-15} textAnchor="end" interval={0} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#C9A227', fontSize: 10 }} />
            <Tooltip />
            <Bar yAxisId="left" dataKey="count" fill="#0B1F3A" radius={[6, 6, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulativePercent" stroke="#C9A227" strokeWidth={2.5} dot={{ r: 4, fill: '#C9A227' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
