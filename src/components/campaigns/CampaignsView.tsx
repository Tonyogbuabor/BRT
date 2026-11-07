import React, { useState } from 'react';
import {
  Target,
  Plus,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Upload,
  Download,
  HelpCircle,
  X
} from 'lucide-react';
import { Campaign, ScoredCustomer } from '../../types/schema';
import { CreateCampaignModal } from './CreateCampaignModal';
import { calculateCampaignImpact } from '../../services/campaigns';
import { exportSafeCsv } from '../../services/reportExport';

interface CampaignsViewProps {
  campaigns: Campaign[];
  scoredCustomers: ScoredCustomer[];
  onSaveCampaign: (campaign: Campaign) => void;
  onUpdateCampaign: (campaign: Campaign) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  scoredCustomers,
  onSaveCampaign,
  onUpdateCampaign
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Outcome recording form state
  const [outcomeForm, setOutcomeForm] = useState({
    contactedCount: 0,
    respondedCount: 0,
    acceptedCount: 0,
    retainedTreatedCount: 0,
    retainedControlCount: 0
  });

  const handleOpenOutcomeModal = (camp: Campaign) => {
    setEditingCampaign(camp);
    setOutcomeForm({
      contactedCount: camp.contactedCount || Math.round(camp.treatedCount * 0.9),
      respondedCount: camp.respondedCount || Math.round(camp.treatedCount * 0.5),
      acceptedCount: camp.acceptedCount || Math.round(camp.treatedCount * 0.35),
      retainedTreatedCount: camp.retainedTreatedCount || Math.round(camp.treatedCount * 0.78),
      retainedControlCount: camp.retainedControlCount || Math.round(camp.controlCount * 0.58)
    });
  };

  const handleSaveOutcomes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    const impact = calculateCampaignImpact(
      editingCampaign.treatedCount,
      editingCampaign.controlCount,
      outcomeForm.contactedCount,
      outcomeForm.respondedCount,
      outcomeForm.acceptedCount,
      outcomeForm.retainedTreatedCount,
      outcomeForm.retainedControlCount,
      editingCampaign.costPerContactGbp,
      editingCampaign.offerCostPerAcceptedGbp
    );

    const updated: Campaign = {
      ...editingCampaign,
      ...impact,
      status: 'Completed'
    };

    onUpdateCampaign(updated);
    setEditingCampaign(null);
  };

  // Portfolio Campaign Aggregations
  const totalCampaigns = campaigns.length;
  const activeReach = campaigns.reduce((acc, c) => acc + c.treatedCount, 0);
  const totalSaves = campaigns.reduce((acc, c) => acc + (c.incrementalSaves || 0), 0);
  const totalRetainedRev = campaigns.reduce((acc, c) => acc + (c.revenueRetainedGbp || 0), 0);
  const totalCost = campaigns.reduce((acc, c) => acc + (c.totalCampaignCostGbp || 0), 0);
  const portfolioRoi = totalCost > 0 ? +(((totalRetainedRev * 0.65 - totalCost) / totalCost) * 100).toFixed(0) : 0;

  const handleExportCampaigns = () => {
    const rows = campaigns.map(c => ({
      'Campaign Name': c.name,
      Status: c.status,
      Channel: c.channel,
      'Target Tier': c.targetTier,
      'Treated Reach': c.treatedCount,
      'Holdout Control': c.controlCount,
      'Incremental Uplift %': c.resultsLoaded ? `${c.incrementalUpliftPercent}%` : 'N/A',
      'z-Test p-Value': c.resultsLoaded ? c.zTestPValue : 'N/A',
      'Incremental Saves': c.incrementalSaves || 0,
      'Retained Revenue (£)': c.revenueRetainedGbp || 0,
      'Total Cost (£)': c.totalCampaignCostGbp || 0,
      'ROI %': c.resultsLoaded ? `${c.roiPercent}%` : 'N/A'
    }));
    exportSafeCsv(rows, `BritConnect_Campaigns_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-slate-900 dark:text-white">
            Retention Campaign Performance Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Design targeted campaigns, enforce stratified holdout control groups, and track true incremental retention uplift.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {campaigns.length > 0 && (
            <button
              onClick={handleExportCampaigns}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Tracker (CSV)</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5C566]" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaign Portfolio Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Campaigns</span>
          <div className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-1">
            {totalCampaigns}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{campaigns.filter(c => c.status === 'Completed').length} completed</p>
        </div>

        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Reach</span>
          <div className="text-xl font-bold font-mono-tabular text-[#1D4C8F] dark:text-[#E5C566] mt-1">
            {activeReach.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Treated customers</p>
        </div>

        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Incremental Saves</span>
          <div className="text-xl font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400 mt-1">
            {totalSaves.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Above holdout control</p>
        </div>

        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Retained Gross Rev</span>
          <div className="text-xl font-bold font-mono-tabular text-[#C9A227] mt-1">
            £{totalRetainedRev.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Annualized saved revenue</p>
        </div>

        <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] p-4 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Portfolio ROI</span>
          <div className="text-xl font-bold font-mono-tabular text-[#0B1F3A] dark:text-white mt-1">
            {portfolioRoi > 0 ? `+${portfolioRoi}%` : '—'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Net retained return</p>
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl">
          <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No Retention Campaigns Configured
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            Create an intervention campaign with automated holdout control grouping to track true incremental uplift and ROI.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors cursor-pointer"
          >
            Create First Retention Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-xl p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-[#1E3452]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {camp.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        camp.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : camp.status === 'Active'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-[#12305A] dark:text-slate-300'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {camp.objective}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                    <span>Channel: <strong className="text-slate-700 dark:text-slate-300">{camp.channel}</strong></span>
                    <span>·</span>
                    <span>Offer: <strong className="text-slate-700 dark:text-slate-300">{camp.offerType}</strong></span>
                    <span>·</span>
                    <span>Target: <strong className="text-slate-700 dark:text-slate-300">{camp.targetTier}</strong></span>
                    <span>·</span>
                    <span>Owner: <strong className="text-slate-700 dark:text-slate-300">{camp.owner}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenOutcomeModal(camp)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-[#C9A227] hover:bg-[#E5C566] rounded-lg transition-colors cursor-pointer"
                  >
                    {camp.resultsLoaded ? 'Update Outcomes' : 'Record Outcomes'}
                  </button>
                </div>
              </div>

              {/* Metrics Breakdown */}
              {camp.resultsLoaded ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-slate-50 dark:bg-[#070F1C] p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Treated Retention</span>
                    <div className="text-base font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {camp.retentionRateTreated}%
                    </div>
                    <span className="text-[10px] text-slate-400">vs {camp.retentionRateControl}% Control</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Incremental Uplift</span>
                    <div className="text-base font-bold font-mono-tabular text-[#1D4C8F] dark:text-[#E5C566] mt-0.5">
                      +{camp.incrementalUpliftPercent}%
                    </div>
                    <span className="text-[10px] text-slate-400">
                      p={camp.zTestPValue} {camp.zTestPValue < 0.05 ? '(p < 0.05)' : '(not sig.)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Incremental Saves</span>
                    <div className="text-base font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                      {camp.incrementalSaves} accts
                    </div>
                    <span className="text-[10px] text-slate-400">Net saved customers</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Retained Margin</span>
                    <div className="text-base font-bold font-mono-tabular text-[#C9A227] mt-0.5">
                      £{(camp.revenueRetainedGbp * 0.65).toFixed(0)}
                    </div>
                    <span className="text-[10px] text-slate-400">Gross £{camp.revenueRetainedGbp.toLocaleString()}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Campaign Cost</span>
                    <div className="text-base font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                      £{camp.totalCampaignCostGbp.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">Cost/Save: £{camp.costPerSaveGbp}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Campaign ROI</span>
                    <div className="text-base font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400 mt-0.5">
                      +{camp.roiPercent}%
                    </div>
                    <span className="text-[10px] text-slate-400">Payback: {camp.paybackPeriodMonths}m</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070F1C] border border-dashed border-slate-200 dark:border-[#1E3452] flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>No outcome data yet recorded. Campaign currently in field targeting {camp.treatedCount.toLocaleString()} customers ({camp.controlCount.toLocaleString()} holdout control).</span>
                  </div>
                  <button
                    onClick={() => handleOpenOutcomeModal(camp)}
                    className="text-xs font-semibold text-[#1D4C8F] dark:text-[#E5C566] hover:underline cursor-pointer"
                  >
                    Simulate / Input Test Outcomes →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          eligibleCustomers={scoredCustomers}
          onSave={(c) => {
            onSaveCampaign(c);
            setShowCreateModal(false);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Record Outcomes Modal */}
      {editingCampaign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E3452] flex items-center justify-between bg-slate-50 dark:bg-[#0B1F3A]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Record Campaign Test Outcomes
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingCampaign.name} ({editingCampaign.treatedCount} treated, {editingCampaign.controlCount} holdout)
                </p>
              </div>
              <button
                onClick={() => setEditingCampaign(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutcomes} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contacted Customers (Treated)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={editingCampaign.treatedCount}
                    value={outcomeForm.contactedCount}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, contactedCount: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Responded Customers
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={outcomeForm.respondedCount}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, respondedCount: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Accepted Offer / Retention Upgrades
                </label>
                <input
                  type="number"
                  min={0}
                  value={outcomeForm.acceptedCount}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, acceptedCount: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-[#1E3452]">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <label className="font-bold text-emerald-900 dark:text-emerald-200 block mb-1">
                    Retained Customers (Treated Group)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={editingCampaign.treatedCount}
                    value={outcomeForm.retainedTreatedCount}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, retainedTreatedCount: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-[#12305A] border border-emerald-300 dark:border-emerald-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white font-bold"
                  />
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 block">
                    Out of {editingCampaign.treatedCount} treated ({editingCampaign.treatedCount > 0 ? ((outcomeForm.retainedTreatedCount / editingCampaign.treatedCount) * 100).toFixed(1) : 0}%)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#12305A]/40 border border-slate-200 dark:border-[#1E3452]">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Retained Customers (Holdout Control)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={editingCampaign.controlCount}
                    value={outcomeForm.retainedControlCount}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, retainedControlCount: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-[#12305A] border border-slate-300 dark:border-[#1E3452] rounded px-2.5 py-1.5 text-slate-900 dark:text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Out of {editingCampaign.controlCount} control ({editingCampaign.controlCount > 0 ? ((outcomeForm.retainedControlCount / editingCampaign.controlCount) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#1E3452] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingCampaign(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors cursor-pointer"
                >
                  Calculate Impact & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
