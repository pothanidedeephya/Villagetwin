import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Bot,
  User,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { fetchAiHazardAssessment, askAiScenarioQuery } from '../../services/aiService';
import type { MultiHazardSummary } from '../../types/hazard';
import type { InfrastructureIntervention } from '../../types/infrastructure';
import type { LocationSearchResult } from '../../types/nationwide';
import type { SimulationResult } from '../../types/village';
import type { RoutePlanningResult } from '../../types/navigation';
import type { WeatherData } from '../../types/weather';
import type { CwcRiverGaugeStation } from '../../types/flood';

interface AiAdvisoryModalProps {
  summary: MultiHazardSummary;
  activeHazard: string;
  interventions: InfrastructureIntervention[];
  location?: LocationSearchResult;
  simulationResult?: SimulationResult;
  navigationResult?: RoutePlanningResult;
  weatherData?: WeatherData | null;
  cwcGauges?: CwcRiverGaugeStation[] | null;
  onClose: () => void;
}

export const AiAdvisoryModal: React.FC<AiAdvisoryModalProps> = ({
  summary,
  activeHazard,
  interventions,
  location,
  simulationResult,
  navigationResult,
  weatherData,
  cwcGauges,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'brief' | 'qa'>('brief');

  // Executive Brief State
  const [briefText, setBriefText] = useState<string>('');
  const [isLoadingBrief, setIsLoadingBrief] = useState<boolean>(true);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Q&A Scenario State
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string; model?: string }>>([
    {
      sender: 'ai',
      text: `Hello! I am your AI Multi-Hazard Disaster Risk Reduction Specialist for ${summary.villageName}. You can ask me any scenario question, such as what happens during concurrent cyclone and storm surges, evacuation corridor safety, or how to optimize your ₹${interventions.reduce((a, b) => a + (b.isEnabled ? b.estimatedCostLakhs : 0), 0)} Lakh infrastructure budget.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Load Executive Brief on mount or hazard switch
  useEffect(() => {
    generateBrief();
  }, [summary.villageName, activeHazard]);

  const generateBrief = async () => {
    setIsLoadingBrief(true);
    setError(null);
    try {
      const enabledInterventions = interventions.filter((i) => i.isEnabled).map((i) => i.name);
      const nearestGauge = cwcGauges?.[0];
      const res = await fetchAiHazardAssessment({
        villageName: summary.villageName,
        district: summary.district,
        mandal: summary.mandal,
        state: location?.state,
        elevation_m: location?.elevation_m,
        regionCategory: location?.regionCategory,
        coordinates: location?.center,
        totalPopulation: summary.totalVulnerablePopulation,
        activeHazard,
        allHazards: Object.keys(summary.assessments),
        selectedInterventions: enabledInterventions,
        simulationResult,
        weatherTelemetry: weatherData ? {
          rainfall_mmh: weatherData.current?.rainfall_mmh ?? 0,
          rainfall24h_mm: weatherData.current?.precipitation_today_mm ?? 0,
          condition: weatherData.current?.condition,
          isStale: weatherData.providerStatus === 'stale',
          isMissing: false,
          provider: weatherData.provider || 'IMD / Open-Meteo',
        } : { isMissing: true, isStale: false, rainfall_mmh: null, rainfall24h_mm: null },
        cwcGauge: nearestGauge ? {
          stationName: nearestGauge.stationName,
          riverName: nearestGauge.riverName,
          currentLevel_m: nearestGauge.currentWaterLevel_m,
          warningLevel_m: nearestGauge.warningLevel_m,
          dangerLevel_m: nearestGauge.dangerLevel_m,
          hfl_m: nearestGauge.hfl_m,
          floodStatus: nearestGauge.floodStatus,
          distance_km: nearestGauge.distanceKm,
          isStale: false,
          isMissing: false,
        } : { isMissing: true, isStale: false, stationName: null, riverName: null, currentLevel_m: null, warningLevel_m: null, dangerLevel_m: null, hfl_m: null, floodStatus: 'Missing', distance_km: null },
      });

      if (res && res.planText) {
        setBriefText(res.planText);
        setModelUsed(res.modelUsed || 'Scientific DRR Knowledge Base');
      } else {
        throw new Error('Empty response received');
      }
    } catch (err: any) {
      console.warn('Advisory generation error:', err);
      setError('Unable to load advisory brief. Please check network connection and retry.');
    } finally {
      setIsLoadingBrief(false);
    }
  };

  const handleSendQuestion = async (qText?: string) => {
    const q = (qText || questionInput).trim();
    if (!q || isAsking) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory((prev) => [...prev, { sender: 'user', text: q, time: timeStr }]);
    setQuestionInput('');
    setIsAsking(true);

    try {
      const nearestGauge = cwcGauges?.[0];
      const res = await askAiScenarioQuery({
        question: q,
        villageName: summary.villageName,
        district: summary.district,
        state: location?.state,
        activeHazard,
        compositeScore: summary.compositeRiskScore,
        location,
        simulationResult,
        routingResult: navigationResult,
        weatherTelemetry: weatherData ? {
          rainfall_mmh: weatherData.current?.rainfall_mmh ?? 0,
          rainfall24h_mm: weatherData.current?.precipitation_today_mm ?? 0,
          condition: weatherData.current?.condition,
          isStale: weatherData.providerStatus === 'stale',
          isMissing: false,
          provider: weatherData.provider,
        } : { isMissing: true, isStale: false, rainfall_mmh: null, rainfall24h_mm: null },
        cwcGauge: nearestGauge ? {
          stationName: nearestGauge.stationName,
          riverName: nearestGauge.riverName,
          currentLevel_m: nearestGauge.currentWaterLevel_m,
          warningLevel_m: nearestGauge.warningLevel_m,
          dangerLevel_m: nearestGauge.dangerLevel_m,
          hfl_m: nearestGauge.hfl_m,
          floodStatus: nearestGauge.floodStatus,
          distance_km: nearestGauge.distanceKm,
          isStale: false,
          isMissing: false,
        } : { isMissing: true, isStale: false, stationName: null, riverName: null, currentLevel_m: null, warningLevel_m: null, dangerLevel_m: null, hfl_m: null, floodStatus: 'Missing', distance_km: null },
      });

      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: res.modelUsed,
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Unable to process scenario query at this moment. Please verify connection and retry.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(briefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleQuestions = [
    'What happens if a Cat-4 Cyclone hits during a 2.0m astronomical high tide?',
    'Which evacuation roads remain passable during 150mm cloudburst?',
    'How should the Gram Panchayat allocate a ₹50 Lakh disaster resilience grant?',
    'What emergency actions are required if heat index exceeds 52°C?',
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                AI Multi-Hazard Risk Intelligence & Scenario Advisory
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-hazard disaster risk reduction reasoning, scenario modeling & SOP briefs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-100/70 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('brief')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'brief'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Executive Action Brief
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'qa'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Interactive Scenario Lab
            </button>
          </div>

          {modelUsed && (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Engine: <strong className="text-slate-700">{modelUsed}</strong>
            </span>
          )}
        </div>

        {/* Tab 1: Executive Action Brief */}
        {activeTab === 'brief' && (
          <div className="flex-1 overflow-y-auto p-5 text-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Active Target: <strong>{summary.villageName}</strong></span>
                <span>·</span>
                <span>Focus Hazard: <strong className="text-blue-700 uppercase">{activeHazard}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!briefText || isLoadingBrief}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded border border-slate-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={generateBrief}
                  disabled={isLoadingBrief}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBrief ? 'animate-spin text-blue-600' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {isLoadingBrief ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs font-medium text-slate-600">
                  Synthesizing multi-hazard data, topography, and civil engineering roadmaps...
                </p>
                <span className="text-[11px] text-slate-400">Usually takes 2–4 seconds</span>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                <p className="text-xs font-semibold text-red-900">{error}</p>
                <button
                  onClick={generateBrief}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Analysis</span>
                </button>
              </div>
            ) : (
              <div className="prose prose-slate max-w-none text-xs leading-relaxed p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-line font-sans">
                {briefText}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Interactive Scenario Lab */}
        {activeTab === 'qa' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preset Query Badges */}
            <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">
                Ask Scenarios:
              </span>
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuestion(q)}
                  disabled={isAsking}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600 hover:text-slate-900 whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white ${
                      msg.sender === 'user' ? 'bg-blue-600' : 'bg-slate-900'
                    }`}
                  >
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div>
                    <div
                      className={`p-3 rounded-2xl ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-slate-100 text-slate-800 rounded-tl-xs whitespace-pre-line'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div
                      className={`text-[10px] text-slate-400 mt-1 flex items-center gap-1 ${
                        msg.sender === 'user' ? 'justify-end' : ''
                      }`}
                    >
                      <span>{msg.time}</span>
                      {msg.model && <span>· {msg.model}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {isAsking && (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Computing hydraulic & multi-hazard impact...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
                placeholder="Ask any multi-hazard scenario (e.g. 'What if storm surge reaches 2.5m at midnight?')..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                disabled={isAsking}
              />
              <button
                onClick={() => handleSendQuestion()}
                disabled={!questionInput.trim() || isAsking}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
