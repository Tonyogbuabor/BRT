import React, { useState } from 'react';
import { X, Target, ArrowRight, ShieldCheck } from 'lucide-react';
import { RiskTier, ScoredCustomer, Campaign } from '../../types/schema';
import { createCampaignWithHoldout } from '../../services/campaigns';

interface CreateCampaignModalProps {
  eligibleCustomers: ScoredCustomer[];
  initialTargetTier?: RiskTier | 'All High/Critical' | 'Custom Cohort';
  initialSegmentName?: string;
  initialOfferType?: string;
  onSave: (campaign: Campaign) => void;
  onClose: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  eligibleCustomers,
  initialTargetTier = 'All High/Critical',
  initialSegmentName,
  initialOfferType = 'Proactive Retention Call + Speed Upgrade',
  onSave,
  onClose
}) => {
  const [name, setName] = useState(
    initialSegmentName
      ? `${initialSegmentName} Retention Drive`
      : 'Q4 High-Risk Contract Cliff Retention Initiative'
  );
  const [objective, setObjective] = useState(
    'Proactively secure 18-month renewals for accounts with imminent contract expiry and unresolved service tickets.'
  );
  const [targetTier, setTargetTier] = useState<RiskTier | 'All High/Critical' | 'Custom Cohort'>(initialTargetTier);
  const [offerType, setOfferType] = useState(initialOfferType);
  const [channel, setChannel] = useState<'Call' | 'Email' | 'SMS' | 'App Notification' | 'Direct Mail'>('Call');
  const [budgetGbp, setBudgetGbp] = useState(5000);
  const [costPerContactGbp, setCostPerContactGbp] = useState(4.50);
  const [offerCostPerAcceptedGbp, setOfferCostPerAcceptedGbp] = useState(25.00);
  const [owner, setOwner] = useState('Retention Team Alpha');
  const [holdoutPercent, setHoldoutPercent] = useState(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { campaign } = createCampaignWithHoldout(
      name,
      objective,
      targetTier,
      initialSegmentName,
      offerType,
      channel,
      budgetGbp,
      costPerContactGbp,
      offerCostPerAcceptedGbp,
      owner,
      holdoutPercent,
      eligibleCustomers
    );
    onSave(campaign);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E3452] flex items-center justify-between bg-slate-50 dark:bg-[#0B1F3A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C9A227]/20 flex items-center justify-center text-[#C9A227]">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create Retention Campaign
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure intervention strategy with automatic randomized holdout control group
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#C9A227]"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Strategic Objective
            </label>
            <textarea
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#C9A227]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Target Risk Tier
              </label>
              <select
                value={targetTier}
                onChange={(e) => setTargetTier(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#C9A227] cursor-pointer"
              >
                <option value="All High/Critical">All High & Critical Risk (≥50%)</option>
                <option value="Critical">Critical Risk Only (≥70%)</option>
                <option value="High">High Risk Only (50-69%)</option>
                <option value="Medium">Medium Risk (30-49%)</option>
                <option value="Custom Cohort">Custom Filtered Cohort</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Outreach Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#C9A227] cursor-pointer"
              >
                <option value="Call">Telephone (Priority Save Desk)</option>
                <option value="Email">Targeted Personalised Email</option>
                <option value="SMS">Interactive Two-Way SMS</option>
                <option value="App Notification">BritConnect Mobile App Push</option>
                <option value="Direct Mail">Executive Direct Letter</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Retention Offer / Intervention Package
            </label>
            <input
              type="text"
              required
              value={offerType}
              onChange={(e) => setOfferType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#C9A227]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Total Budget (£)
              </label>
              <input
                type="number"
                min={100}
                value={budgetGbp}
                onChange={(e) => setBudgetGbp(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Cost per Contact (£)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={costPerContactGbp}
                onChange={(e) => setCostPerContactGbp(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Cost per Accepted Offer (£)
              </label>
              <input
                type="number"
                step="1"
                min={0}
                value={offerCostPerAcceptedGbp}
                onChange={(e) => setOfferCostPerAcceptedGbp(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Campaign Owner
              </label>
              <input
                type="text"
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Holdout Control Group (%)
              </label>
              <select
                value={holdoutPercent}
                onChange={(e) => setHoldoutPercent(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-lg px-3 py-2 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value={10}>10% Holdout Control</option>
                <option value={15}>15% Holdout Control (Standard)</option>
                <option value={20}>20% Holdout Control (High Statistical Power)</option>
              </select>
            </div>
          </div>

          {/* Holdout Notice */}
          <div className="p-3 rounded-lg bg-[#12305A]/10 border border-[#1D4C8F]/30 flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
            <span>
              The system automatically holds out {holdoutPercent}% of eligible customers at random to serve as an uncontacted control group, ensuring genuine incremental uplift measurement without placebo contamination.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#1E3452] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Launch & Stratify Holdout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
