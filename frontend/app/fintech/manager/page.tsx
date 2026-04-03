'use client';

import { useAppContext } from '@/lib/AppContext';
import { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, FileText, Eye, Code, BarChart3, AlertTriangle,
  CheckCircle2, Zap, Lock, Download, Send, Database
} from 'lucide-react';

// Mock data for multiple applications
const mockApplications = [
  {
    id: 'APP-001',
    companyName: 'TechVentures Inc.',
    loanAmount: 500000,
    riskLevel: 'medium',
    currentStage: 'CAM Ready',
    credibilityScore: 78,
  },
  {
    id: 'APP-002',
    companyName: 'GreenEnergy Solutions',
    loanAmount: 750000,
    riskLevel: 'low',
    currentStage: 'Site Visit',
    credibilityScore: 85,
  },
  {
    id: 'APP-003',
    companyName: 'RetailHub Networks',
    loanAmount: 350000,
    riskLevel: 'high',
    currentStage: 'Financial Analysis',
    credibilityScore: 62,
  },
];

// Mock AI analysis data
const mockAIAnalysis = {
  credibility: {
    score: 78,
    reasoning: [
      'Company established for 4 years with consistent revenue growth',
      'Directors have 15+ years combined fintech experience',
      'Positive feedback from banking relationships (3 major banks)',
      'GST filings show 98% compliance',
      'Minor: One director change 18 months ago'
    ]
  },
  financial: {
    ebitda: { current: 850000, trend: [600000, 680000, 750000, 800000, 850000] },
    dscr: { current: 1.8, trend: [1.4, 1.5, 1.6, 1.7, 1.8] },
    currentRatio: { current: 2.1, trend: [1.6, 1.75, 1.85, 2.0, 2.1] },
  },
  industry: {
    sector: 'Technology - SaaS',
    marketSize: '$45B',
    growthRate: '22% YoY',
    competitiveBenchmark: 'Above Average',
    reasoning: [
      'SaaS sector showing strong growth trajectory',
      'Company market share increasing 2.5% annually',
      'Competitive advantage through proprietary technology'
    ]
  },
  siteReview: {
    visitDate: '2024-03-20',
    findings: [
      'Office infrastructure well-maintained',
      'Adequate workforce: 45 full-time employees',
      'Modern IT infrastructure and security measures',
      'Inventory management: Adequate',
      'No red flags observed'
    ]
  },
  risk: {
    probabilityOfDefault: 18,
    keyRisks: [
      'Customer concentration: Top 3 clients = 35% revenue',
      'Tech industry volatility',
      'Key person dependency on CTO'
    ],
    collateralValue: 1500000,
    loanAmount: 500000,
  }
};

const ChainOfThoughtStep = ({ step, index, hash }) => {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div
      className="mb-3 p-3 rounded-lg animate-in fade-in duration-300"
      style={{
        backgroundColor: '#1E2A3A',
        border: '1px solid #1E2A3A',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 text-left"
      >
        <div className="flex items-center gap-2 flex-1">
          <span style={{ color: '#D4A843' }} className="font-bold text-sm">
            Step {index + 1}
          </span>
          <span style={{ color: '#64748B' }} className="text-xs font-mono">
            {hash}
          </span>
          <Database size={12} style={{ color: '#D4A843' }} />
        </div>
        {expanded ? (
          <ChevronUp size={16} style={{ color: '#64748B' }} />
        ) : (
          <ChevronDown size={16} style={{ color: '#64748B' }} />
        )}
      </button>
      {expanded && (
        <p style={{ color: '#F1F5F9' }} className="text-sm mt-2 pl-4">
          {step}
        </p>
      )}
    </div>
  );
};

const RiskGauge = ({ probabilityOfDefault }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (probabilityOfDefault / 100) * circumference;

  const getColor = (value) => {
    if (value < 20) return '#2DD4A0';
    if (value < 40) return '#D4A843';
    return '#EF4444';
  };

  return (
    <div
      className="rounded-lg p-6 animate-in fade-in duration-300"
      style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
    >
      <p style={{ color: '#64748B' }} className="text-sm mb-4">
        Probability of Default
      </p>
      <div className="flex flex-col items-center justify-center py-6">
        <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="45"
            fill="none"
            stroke="#1E2A3A"
            strokeWidth="8"
          />
          <circle
            cx="80"
            cy="80"
            r="45"
            fill="none"
            stroke={getColor(probabilityOfDefault)}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <p
          className="text-2xl font-bold font-mono mt--12"
          style={{ color: getColor(probabilityOfDefault) }}
        >
          {probabilityOfDefault}%
        </p>
      </div>
    </div>
  );
};

const SimpleSparkline = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = ((max - val) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const MetricCard = ({ label, value, unit, trend, color }) => (
  <div
    className="rounded-lg p-4 animate-in fade-in duration-300"
    style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
  >
    <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
      {label}
    </p>
    <div className="flex items-baseline gap-2 mb-2">
      <p className="text-2xl font-bold font-mono" style={{ color: '#D4A843' }}>
        {value}
      </p>
      <p style={{ color: '#64748B' }} className="text-sm">
        {unit}
      </p>
    </div>
    {trend && (
      <div className="h-8">
        <SimpleSparkline data={trend} color={color || '#D4A843'} />
      </div>
    )}
  </div>
);

const CAMModal = ({ isOpen, onClose, appData }) => {
  if (!isOpen) return null;

  const companyName = appData?.companyName || 'No application selected';
  const loanAmountText = appData?.loanAmount ? `₹${Number(appData.loanAmount).toLocaleString('en-IN')}` : 'Awaiting request';
  const riskLabel = appData?.riskLevel ? String(appData.riskLevel).toUpperCase() : 'PENDING';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-lg overflow-y-auto animate-in zoom-in duration-300"
        style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6 border-b flex items-center justify-between sticky top-0"
          style={{ borderColor: '#1E2A3A', backgroundColor: '#141929' }}
        >
          <h2 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
            Credit Appraisal Memo
          </h2>
          <button
            onClick={onClose}
            className="text-xl hover:opacity-70 transition-opacity"
            style={{ color: '#64748B' }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Executive Summary */}
          <div>
            <h3 className="text-lg font-bold mb-3" style={{ color: '#F1F5F9' }}>
              Executive Summary
            </h3>
            <p style={{ color: '#64748B' }} className="leading-relaxed">
              {companyName} is being evaluated through the connected underwriting workflow for a requested amount of {loanAmountText}.
              The memo combines backend scoring, alternative-signal analysis, and risk review to support a lender-facing decision.
            </p>
          </div>

          {/* Financial Highlights */}
          <div>
            <h3 className="text-lg font-bold mb-3" style={{ color: '#F1F5F9' }}>
              Financial Highlights
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
              >
                <p style={{ color: '#64748B' }} className="text-xs mb-1">
                  EBITDA
                </p>
                <p className="font-mono font-bold" style={{ color: '#2DD4A0' }}>
                  ₹85L
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
              >
                <p style={{ color: '#64748B' }} className="text-xs mb-1">
                  DSCR
                </p>
                <p className="font-mono font-bold" style={{ color: '#2DD4A0' }}>
                  1.8x
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
              >
                <p style={{ color: '#64748B' }} className="text-xs mb-1">
                  Current Ratio
                </p>
                <p className="font-mono font-bold" style={{ color: '#2DD4A0' }}>
                  2.1x
                </p>
              </div>
            </div>
          </div>

          {/* Risk Summary */}
          <div>
            <h3 className="text-lg font-bold mb-3" style={{ color: '#F1F5F9' }}>
              Risk Summary
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} style={{ color: '#F59E0B', marginTop: '2px' }} />
                <div>
                  <p style={{ color: '#F1F5F9' }} className="text-sm">
                    Customer Concentration
                  </p>
                  <p style={{ color: '#64748B' }} className="text-xs">
                    Top 3 clients represent 35% of revenue
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} style={{ color: '#F59E0B', marginTop: '2px' }} />
                <div>
                  <p style={{ color: '#F1F5F9' }} className="text-sm">
                    Key Person Risk
                  </p>
                  <p style={{ color: '#64748B' }} className="text-xs">
                    Dependency on CTO for technical operations
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div
            className="p-4 rounded-lg border-l-4"
            style={{
              backgroundColor: 'rgba(45, 212, 160, 0.1)',
              borderColor: '#2DD4A0',
            }}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 size={20} style={{ color: '#2DD4A0', marginTop: '2px' }} />
              <div>
                <p style={{ color: '#F1F5F9' }} className="font-bold">
                  Recommendation: {riskLabel === 'HIGH' ? 'MANUAL REVIEW' : 'APPROVE'}
                </p>
                <p style={{ color: '#64748B' }} className="text-sm mt-1">
                  Proposed ticket size is aligned to the connected scoring outputs shown in this workspace.
                  Final sanction, pricing, and collateral terms should be confirmed by the credit committee.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-4 pt-4 border-t" style={{ borderColor: '#1E2A3A' }}>
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: '#1E2A3A',
                color: '#F1F5F9',
                border: '1px solid #1E2A3A',
              }}
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 hover:opacity-90"
              style={{
                backgroundColor: '#D4A843',
                color: '#0B0F1A',
              }}
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ManagerPage() {
  const { state } = useAppContext();
  const [selectedAppId, setSelectedAppId] = useState(state.applicationState.applicationId || 'APP-001');
  const [activeTab, setActiveTab] = useState('credibility');
  const [documentView, setDocumentView] = useState('raw');
  const [showCAMModal, setShowCAMModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const backendScoring = state.formData.backendScoring || {};
  const gstinResult = backendScoring.gstinResult;
  const scoreResult = backendScoring.scoreResult;
  const extractedPayload = backendScoring.extractedPayload || {};
  const processedDocuments = backendScoring.processedDocuments || [];

  useEffect(() => {
    if (state.applicationState.applicationId) {
      setSelectedAppId(state.applicationState.applicationId);
    }
  }, [state.applicationState.applicationId]);

  const hasLiveApplication = Boolean(
    state.applicationState.applicationId ||
    state.applicationState.companyName ||
    gstinResult ||
    scoreResult ||
    processedDocuments.length
  );

  const liveApplication = hasLiveApplication
    ? {
        id: state.applicationState.applicationId || 'APP-LIVE',
        companyName: state.applicationState.companyName || gstinResult?.gstin || 'Active Application',
        loanAmount: Math.round(gstinResult?.recommended_loan_amount || state.applicationState.loanAmount || 0),
        riskLevel: state.applicationState.riskLevel || 'medium',
        currentStage: state.applicationState.currentStage.replace(/_/g, ' '),
        credibilityScore: gstinResult?.credit_score ? Math.round((gstinResult.credit_score - 300) / 6) : 0,
      }
    : null;

  const applications = liveApplication ? [liveApplication] : [];
  const selectedApp = applications.find((app) => app.id === selectedAppId) || liveApplication;

  const monthlyRevenue = Number(extractedPayload.monthly_revenue || 0);
  const recommendedLoan = Number(gstinResult?.recommended_loan_amount || state.applicationState.loanAmount || 0);
  const baseProfit = monthlyRevenue > 0 ? monthlyRevenue * 0.22 : 0;
  const aiAnalysis = {
    credibility: {
      score: liveApplication?.credibilityScore || 0,
      reasoning: gstinResult?.top_reasons || [],
    },
    financial: {
      ebitda: {
        current: Math.round(baseProfit),
        trend: monthlyRevenue > 0
          ? [0.72, 0.8, 0.88, 0.94, 1].map((factor) => Math.round(baseProfit * factor))
          : [],
      },
      dscr: {
        current: scoreResult ? Number((1.1 + Math.max(scoreResult.final_score - 50, 0) / 40).toFixed(1)) : 0,
        trend: scoreResult ? [0.9, 1.0, 1.15, 1.25, 1.35].map((factor) => Number((factor + Math.max(scoreResult.final_score - 60, 0) / 100).toFixed(1))) : [],
      },
      currentRatio: {
        current: extractedPayload.total_debt && monthlyRevenue
          ? Number((1.2 + monthlyRevenue / Math.max(Number(extractedPayload.total_debt), 1) / 2).toFixed(1))
          : 0,
        trend: extractedPayload.total_debt && monthlyRevenue
          ? [0.82, 0.9, 0.95, 1.0, 1.08].map((factor) => Number(((1.2 + monthlyRevenue / Math.max(Number(extractedPayload.total_debt), 1) / 2) * factor).toFixed(1)))
          : [],
      },
    },
    industry: {
      sector: gstinResult ? 'MSME Alternative Signal Profile' : 'No sector data yet',
      marketSize: gstinResult ? 'Mocked live GST + UPI + e-way signal universe' : 'Awaiting scoring input',
      growthRate: gstinResult?.risk_band || 'Awaiting scoring',
      competitiveBenchmark: gstinResult ? `${gstinResult.risk_band} segment` : 'Awaiting benchmark',
      reasoning: gstinResult?.top_reasons || [],
    },
    siteReview: {
      visitDate: state.applicationState.lastUpdated || '',
      findings: processedDocuments.length
        ? processedDocuments.map((doc: { source_document: string; document_type: string }) => `Processed ${doc.document_type} document: ${doc.source_document}`)
        : [],
    },
    risk: {
      probabilityOfDefault: Math.round((gstinResult?.probability_of_default || 0) * 100),
      keyRisks: gstinResult
        ? [
            ...(gstinResult.fraud_flag ? [gstinResult.fraud_summary] : []),
            ...gstinResult.top_reasons.slice(0, 3),
          ]
        : [],
      collateralValue: Math.round(recommendedLoan * 1.4),
      loanAmount: recommendedLoan,
    },
  };
  const rawDocuments = state.documents.length
    ? state.documents.map((doc) => ({
        name: doc.name,
        pages: 1,
      }))
    : [];

  const processedDocumentPreview = gstinResult
    ? {
        gstin: gstinResult.gstin,
        credit_score: gstinResult.credit_score,
        risk_band: gstinResult.risk_band,
        recommended_loan_amount: gstinResult.recommended_loan_amount,
        recommended_tenure_months: gstinResult.recommended_tenure_months,
        top_reasons: gstinResult.top_reasons,
        documents: processedDocuments,
      }
    : null;

  const getRiskColor = (level) => {
    if (level === 'low') return '#2DD4A0';
    if (level === 'medium') return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div
      className="min-h-screen flex overflow-hidden animate-in fade-in duration-300"
      style={{ backgroundColor: '#0B0F1A' }}
    >
      {/* LEFT PANEL - Application Pipeline (20%) */}
      <div
        className="w-1/5 border-r overflow-y-auto p-4 space-y-3"
        style={{ borderColor: '#1E2A3A' }}
      >
        <h2 className="text-sm font-bold uppercase mb-4" style={{ color: '#D4A843' }}>
          Application Pipeline
        </h2>
        {applications.map((app) => (
          <button
            key={app.id}
            onClick={() => setSelectedAppId(app.id)}
            className="w-full p-3 rounded-lg text-left transition-all border-l-4 hover:opacity-90"
            style={{
              backgroundColor: selectedAppId === app.id ? '#1E2A3A' : '#141929',
              borderColor: selectedAppId === app.id ? '#D4A843' : 'transparent',
              borderRightColor: '#1E2A3A',
            }}
          >
            <p style={{ color: '#F1F5F9' }} className="font-semibold text-sm truncate">
              {app.companyName}
            </p>
            <p style={{ color: '#D4A843' }} className="font-mono text-xs mt-1">
              ₹{(app.loanAmount / 100000).toFixed(1)}L
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: getRiskColor(app.riskLevel) + '20',
                  color: getRiskColor(app.riskLevel),
                }}
              >
                {app.riskLevel.toUpperCase()}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: '#1E2A3A',
                  color: '#D4A843',
                }}
              >
                {app.currentStage}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* CENTER PANEL - AI Analysis Workspace (55%) */}
      <div
        className="w-3/5 border-r overflow-y-auto flex flex-col"
        style={{ borderColor: '#1E2A3A' }}
      >
        {/* Tabs */}
        <div
          className="border-b sticky top-0 flex bg-opacity-95"
          style={{ borderColor: '#1E2A3A', backgroundColor: '#0B0F1A' }}
        >
          {['credibility', 'financial', 'industry', 'siteReview', 'risk'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize"
              style={{
                borderColor: activeTab === tab ? '#D4A843' : 'transparent',
                color: activeTab === tab ? '#D4A843' : '#64748B',
              }}
            >
              {tab === 'siteReview' ? 'Site Review' : tab.replace(/([A-Z])/g, ' $1')}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {activeTab === 'credibility' && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div
                  className="rounded-lg p-4 col-span-3 animate-in fade-in duration-300"
                  style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
                >
                  <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
                    Credibility Score
                  </p>
                  <p className="text-4xl font-bold" style={{ color: '#D4A843' }}>
                    {aiAnalysis.credibility.score}/100
                  </p>
                </div>
              </div>

              <h3 className="font-bold mb-3" style={{ color: '#F1F5F9' }}>
                Chain of Thought Analysis
              </h3>
              <div>
                {aiAnalysis.credibility.reasoning.map((step, idx) => (
                  <ChainOfThoughtStep
                    key={idx}
                    step={step}
                    index={idx}
                    hash={`0x${Math.random().toString(16).slice(2, 10)}`}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  label="EBITDA"
                  value={`₹${(aiAnalysis.financial.ebitda.current / 100000).toFixed(1)}`}
                  unit="L"
                  trend={aiAnalysis.financial.ebitda.trend}
                  color="#2DD4A0"
                />
                <MetricCard
                  label="DSCR"
                  value={aiAnalysis.financial.dscr.current}
                  unit="x"
                  trend={aiAnalysis.financial.dscr.trend}
                  color="#2DD4A0"
                />
                <MetricCard
                  label="Current Ratio"
                  value={aiAnalysis.financial.currentRatio.current}
                  unit="x"
                  trend={aiAnalysis.financial.currentRatio.trend}
                  color="#2DD4A0"
                />
              </div>

              <h3 className="font-bold mt-6" style={{ color: '#F1F5F9' }}>
                Financial Analysis Chain of Thought
              </h3>
              <div>
                {[
                  'Revenue growth: 18% CAGR over 3 years',
                  'Net margin improved from 22% to 28%',
                  'DSCR consistently above 1.5x threshold',
                  'Working capital cycle: 45 days (healthy)',
                ].map((step, idx) => (
                  <ChainOfThoughtStep
                    key={idx}
                    step={step}
                    index={idx}
                    hash={`0x${Math.random().toString(16).slice(2, 10)}`}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'industry' && (
            <div className="space-y-4">
              <div
                className="rounded-lg p-4 animate-in fade-in duration-300"
                style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
              >
                <p style={{ color: '#64748B' }} className="text-xs uppercase mb-3">
                  Industry Overview
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p style={{ color: '#64748B' }} className="text-xs">
                      Sector
                    </p>
                    <p style={{ color: '#F1F5F9' }} className="font-semibold">
                      {aiAnalysis.industry.sector}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#64748B' }} className="text-xs">
                      Market Size
                    </p>
                    <p style={{ color: '#F1F5F9' }} className="font-semibold">
                      {aiAnalysis.industry.marketSize}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#64748B' }} className="text-xs">
                      Growth Rate
                    </p>
                    <p style={{ color: '#2DD4A0' }} className="font-semibold">
                      {aiAnalysis.industry.growthRate}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#64748B' }} className="text-xs">
                      Competitive Position
                    </p>
                    <p style={{ color: '#F1F5F9' }} className="font-semibold">
                      {aiAnalysis.industry.competitiveBenchmark}
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="font-bold" style={{ color: '#F1F5F9' }}>
                Market Analysis Chain of Thought
              </h3>
              <div>
                {aiAnalysis.industry.reasoning.map((step, idx) => (
                  <ChainOfThoughtStep
                    key={idx}
                    step={step}
                    index={idx}
                    hash={`0x${Math.random().toString(16).slice(2, 10)}`}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'siteReview' && (
            <div className="space-y-4">
              <div
                className="rounded-lg p-4 animate-in fade-in duration-300"
                style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
              >
                <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
                  Visit Date
                </p>
                <p style={{ color: '#F1F5F9' }} className="font-semibold">
                  {isClient ? new Date(aiAnalysis.siteReview.visitDate).toLocaleDateString() : 'Loading...'}
                </p>
              </div>

              <h3 className="font-bold" style={{ color: '#F1F5F9' }}>
                Site Findings
              </h3>
              <div>
                {aiAnalysis.siteReview.findings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="mb-3 p-3 rounded-lg flex items-start gap-2 animate-in fade-in duration-300"
                    style={{
                      backgroundColor: '#1E2A3A',
                      animationDelay: `${idx * 50}ms`,
                    }}
                  >
                    <CheckCircle2 size={16} style={{ color: '#2DD4A0', marginTop: '2px', flexShrink: 0 }} />
                    <p style={{ color: '#F1F5F9' }} className="text-sm">
                      {finding}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="grid grid-cols-2 gap-6">
              <RiskGauge probabilityOfDefault={aiAnalysis.risk.probabilityOfDefault} />
              <div className="space-y-4">
                <div
                  className="rounded-lg p-4 animate-in fade-in duration-300"
                  style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
                >
                  <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
                    Collateral
                  </p>
                  <p className="font-mono text-lg" style={{ color: '#D4A843' }}>
                    ₹{(aiAnalysis.risk.collateralValue / 100000).toFixed(1)}L
                  </p>
                  <p style={{ color: '#64748B' }} className="text-xs mt-1">
                    {(aiAnalysis.risk.collateralValue / aiAnalysis.risk.loanAmount).toFixed(1)}x LTV
                  </p>
                </div>

                <div>
                  <h4 className="font-bold mb-2" style={{ color: '#F1F5F9' }}>
                    Key Risks
                  </h4>
                  <div className="space-y-2">
                    {aiAnalysis.risk.keyRisks.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <AlertTriangle size={14} style={{ color: '#F59E0B', marginTop: '2px', flexShrink: 0 }} />
                        <p style={{ color: '#64748B' }} className="text-xs">
                          {risk}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate CAM Button */}
        <div
          className="border-t p-4 flex gap-2"
          style={{ borderColor: '#1E2A3A', backgroundColor: '#141929' }}
        >
          <button
            onClick={() => setShowCAMModal(true)}
            className="flex-1 py-3 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#D4A843',
              color: '#0B0F1A',
            }}
          >
            <Zap size={18} />
            Generate CAM
          </button>
          <button
            className="px-6 py-3 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: '#1E2A3A',
              color: '#F1F5F9',
              border: '1px solid #1E2A3A',
            }}
          >
            Save Analysis
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - Document Viewer (25%) */}
      <div
        className="w-1/4 border-l overflow-y-auto flex flex-col"
        style={{ borderColor: '#1E2A3A' }}
      >
        {/* Toggle */}
        <div className="flex border-b sticky top-0 bg-opacity-95" style={{ borderColor: '#1E2A3A', backgroundColor: '#0B0F1A' }}>
          {['raw', 'processed'].map((view) => (
            <button
              key={view}
              onClick={() => setDocumentView(view)}
              className="flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors capitalize"
              style={{
                borderColor: documentView === view ? '#D4A843' : 'transparent',
                color: documentView === view ? '#D4A843' : '#64748B',
              }}
            >
              {view === 'raw' ? 'Raw Docs' : 'Processed'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {documentView === 'raw' && (
            <div className="space-y-2">
              {rawDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border animate-in fade-in duration-300"
                  style={{
                    backgroundColor: '#141929',
                    borderColor: '#1E2A3A',
                    animationDelay: `${idx * 50}ms`,
                  }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <FileText size={16} style={{ color: '#D4A843', marginTop: '2px' }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: '#F1F5F9' }} className="text-xs font-mono truncate">
                        {doc.name}
                      </p>
                      <p style={{ color: '#64748B' }} className="text-xs">
                        {doc.pages} page{doc.pages > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button className="w-full py-1.5 text-xs rounded flex items-center justify-center gap-1 transition-all hover:opacity-80"
                    style={{
                      backgroundColor: '#1E2A3A',
                      color: '#D4A843',
                    }}
                  >
                    <Eye size={12} />
                    View
                  </button>
                </div>
              ))}
            </div>
          )}

          {documentView === 'processed' && (
            <div
              className="p-3 rounded-lg font-mono text-xs animate-in fade-in duration-300"
              style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
            >
              <pre style={{ color: '#D4A843', overflowX: 'auto' }}>{JSON.stringify(processedDocumentPreview, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* CAM Modal */}
      <CAMModal isOpen={showCAMModal} onClose={() => setShowCAMModal(false)} appData={selectedApp} />
    </div>
  );
}
