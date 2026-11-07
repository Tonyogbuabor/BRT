import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  RotateCcw,
  User,
  ShieldCheck,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { CustomerRecord, ScoredCustomer, ModelCard } from '../../types/schema';
import { ComputedKPIs } from '../../services/deterministicAnalytics';

interface AiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpis: ComputedKPIs | null;
  records: CustomerRecord[];
  scoredCustomers: ScoredCustomer[];
  activeModel: ModelCard | null;
  isFloating?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiChatbotModal: React.FC<AiChatbotModalProps> = ({
  isOpen,
  onClose,
  kpis,
  records,
  scoredCustomers,
  activeModel,
  isFloating = false
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello, I am BritConnect's AI Churn Intelligence Assistant. I have direct access to your verified customer database (${records.length.toLocaleString()} accounts) and machine learning risk scores.\n\nAsk me any question about portfolio churn rate, contract expiry cliffs, root-cause drivers, or bespoke retention playbooks.`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const starterPrompts = [
    'Which customers are most likely to churn in the next 30 days?',
    'Why is churn higher in Small Business vs Consumer?',
    'How much revenue is at risk from contracts expiring in 60 days?',
    'Compare churn between fixed-term and rolling contracts',
    'What retention plan do you recommend for our Critical tier accounts?'
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      // Build rich grounding context from deterministic database
      const contextData = {
        kpis,
        activeModelSummary: activeModel ? {
          algorithm: activeModel.algorithm,
          prAuc: activeModel.metrics.prAuc,
          rocAuc: activeModel.metrics.rocAuc,
          activeFeatures: activeModel.activeFeatures
        } : null,
        topRiskCustomers: scoredCustomers.slice(0, 10).map(c => ({
          id: c.id,
          probability: c.churnProbability,
          riskTier: c.riskTier,
          monthlySpend: c.effectiveMonthlyCharge,
          revenueAtRisk: c.expectedMonthlyRevenueAtRisk,
          contractEndDate: c.record.contractEndDate,
          csat: c.record.satisfactionScore110,
          complaints: c.record.complaints12m,
          outages: c.record.networkOutages12m,
          primaryDriver: c.topDrivers[0]?.plainEnglish
        }))
      };

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          contextData
        })
      });

      if (!res.ok) throw new Error('Failed to get answer');
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'I was unable to process that question based on current data.',
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Error: Unable to connect to server-side Gemini analytics. Based on local data: ${kpis?.totalCustomers || 0} customers evaluated, active churn rate is ${kpis?.churnRatePercent || 0}%, with £${kpis?.modelRevenueAtRiskGbp || 0}/mo exposed revenue.`,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversation history reset. How can I assist your retention analysis today?',
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div
      className={
        isFloating
          ? 'fixed bottom-4 right-4 z-50 w-full max-w-lg h-[620px] bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl shadow-2xl flex flex-col overflow-hidden'
          : 'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4'
      }
    >
      <div
        className={
          isFloating
            ? 'flex flex-col h-full w-full'
            : 'bg-white dark:bg-[#0D1C30] border border-slate-200 dark:border-[#1E3452] rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden'
        }
      >
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-[#1E3452] flex items-center justify-between bg-slate-50 dark:bg-[#0B1F3A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C9A227]/20 flex items-center justify-center text-[#C9A227]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>BritConnect Natural-Language AI Analytics</span>
                <span className="text-[10px] text-emerald-600 font-semibold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60">
                  Grounded
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Queries local deterministic data functions · Zero fabricated numbers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                    isUser
                      ? 'bg-[#1D4C8F] text-white'
                      : 'bg-[#0B1F3A] text-[#E5C566]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[82%] p-4 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#1D4C8F] text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-[#070F1C] border border-slate-200 dark:border-[#1E3452] text-slate-800 dark:text-slate-200 rounded-tl-none shadow-2xs'
                  }`}
                >
                  <div>{m.content}</div>

                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-[#1E3452]/50 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{m.timestamp}</span>
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <Sparkles className="w-4 h-4 text-[#C9A227] animate-spin" />
              <span>Querying deterministic customer database and formulating answer...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts */}
        {messages.length <= 2 && (
          <div className="px-6 py-2 border-t border-slate-100 dark:border-[#1E3452] overflow-x-auto flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Suggestions:
            </span>
            {starterPrompts.map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 dark:hover:bg-[#1D4C8F] rounded-md transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <div className="p-4 border-t border-slate-200 dark:border-[#1E3452] bg-white dark:bg-[#0D1C30]">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about customer churn, risk drivers, or retention tactics..."
              className="flex-1 bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1E3452] rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#C9A227]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 rounded-xl font-semibold text-white bg-[#0B1F3A] hover:bg-[#12305A] transition-colors disabled:opacity-40 flex items-center justify-center cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4 text-[#E5C566]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
