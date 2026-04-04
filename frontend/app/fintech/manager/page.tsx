'use client';

import { useAppContext } from '@/lib/AppContext';
import { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, FileText, Eye, Code, BarChart3, AlertTriangle,
  CheckCircle2, Zap, Lock, Download, Send, Database
} from 'lucide-react';

const APPLICATION_ASSIGNMENTS_KEY = 'finserv-aim-applications';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
const CHAT_STORAGE_KEY = 'finserv-aim-chat-messages';
const API_BASE_CANDIDATES = [API_BASE_URL];
const CHAT_API_BASES = [API_BASE_URL];

type StoredChatMessage = {
  id: number;
  applicationId: string;
  senderRole: 'borrower' | 'manager';
  senderName: string;
  borrowerEmail?: string;
  companyName?: string;
  subject?: string;
  message: string;
  attachmentName?: string;
  timestamp: string;
};

type StoredAssignedApplication = {
  id: string;
  borrowerEmail: string;
  borrowerName: string;
  managerEmail: string | null;
  managerName: string | null;
  companyName: string;
  loanAmount: number;
  riskLevel: 'low' | 'medium' | 'high';
  currentStage: string;
  credibilityScore: number;
  createdAt: string;
  updatedAt: string;
  assignmentStatus?: 'pending' | 'accepted';
  acceptedAt?: string | null;
  backendScoring?: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
};

type ManagerApplicationCard = {
  id: string;
  borrowerEmail?: string;
  borrowerName?: string;
  managerEmail?: string | null;
  managerName?: string | null;
  assignmentStatus?: 'pending' | 'accepted';
  acceptedAt?: string | null;
  createdAt?: string;
  companyName: string;
  loanAmount: number;
  riskLevel: 'low' | 'medium' | 'high';
  currentStage: string;
  credibilityScore: number;
  updatedAt?: string;
  scoringSummary?: {
    pd?: number;
    final_score?: number;
    decision?: string;
    risk_category?: string;
    credit_score?: number;
    risk_band?: string;
    probability_of_default?: number;
    recommended_loan_amount?: number;
    recommended_tenure_months?: number;
    top_reasons?: string[];
    document_count?: number;
  };
  tabAnalysis?: {
    narrativeSource?: string;
    credibility?: { score?: number; reasoning?: string[] };
    financial?: {
      ebitda?: { current?: number; trend?: number[] };
      dscr?: { current?: number; trend?: number[] };
      currentRatio?: { current?: number; trend?: number[] };
      reasoning?: string[];
    };
    industry?: {
      sector?: string;
      marketSize?: string;
      growthRate?: string;
      competitiveBenchmark?: string;
      reasoning?: string[];
    };
    siteReview?: { visitDate?: string; findings?: string[] };
    risk?: {
      probabilityOfDefault?: number;
      keyRisks?: string[];
      collateralValue?: number;
      loanAmount?: number;
    };
  };
  backendScoring?: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
};

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
  const pdValue = Number.isFinite(Number(probabilityOfDefault))
    ? Math.max(0, Math.min(100, Number(probabilityOfDefault)))
    : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (pdValue / 100) * circumference;

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
            stroke={getColor(pdValue)}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <p
          className="text-2xl font-bold font-mono mt--12"
          style={{ color: getColor(pdValue) }}
        >
          {pdValue}%
        </p>
      </div>
    </div>
  );
};

const SimpleSparkline = ({ data, color }) => {
  const normalized = Array.isArray(data)
    ? data.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];

  if (normalized.length < 2) {
    return (
      <div className="w-full h-8" style={{ borderTop: '1px dashed #1E2A3A' }} />
    );
  }

  const max = Math.max(...normalized);
  const min = Math.min(...normalized);
  const range = max - min || 1;
  const points = normalized
    .map((val, i) => {
      const x = (i / (normalized.length - 1)) * 100;
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
    {Array.isArray(trend) && trend.length > 1 && (
      <div className="h-8">
        <SimpleSparkline data={trend} color={color || '#D4A843'} />
      </div>
    )}
  </div>
);

const CAMModal = ({
  isOpen,
  onClose,
  appData,
  analysis,
  scoreOutput,
  gstinOutput,
}) => {
  if (!isOpen) return null;

  const companyName = appData?.companyName || 'No application selected';
  const loanAmountText = appData?.loanAmount ? `₹${Number(appData.loanAmount).toLocaleString('en-IN')}` : 'Awaiting request';
  const riskLabel = appData?.riskLevel ? String(appData.riskLevel).toUpperCase() : 'PENDING';
  const decision = String(scoreOutput?.decision || (riskLabel === 'HIGH' ? 'MANUAL REVIEW' : 'APPROVE')).toUpperCase();
  const pdPercent = Number(analysis?.risk?.probabilityOfDefault || 0);
  const ebitdaCurrent = Number(analysis?.financial?.ebitda?.current || 0);
  const dscrCurrent = Number(analysis?.financial?.dscr?.current || 0);
  const currentRatioCurrent = Number(analysis?.financial?.currentRatio?.current || 0);
  const riskItems = Array.isArray(analysis?.risk?.keyRisks) ? analysis.risk.keyRisks.filter(Boolean).slice(0, 4) : [];
  const recommendationTone = decision.includes('APPROVE')
    ? { bg: 'rgba(45, 212, 160, 0.1)', border: '#2DD4A0', icon: '#2DD4A0' }
    : { bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B', icon: '#F59E0B' };

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
              Current model decision is {decision} with PD at {pdPercent.toFixed(1)}% and risk band {String(gstinOutput?.risk_band || riskLabel).toUpperCase()}.
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
                  {ebitdaCurrent > 0 ? `₹${(ebitdaCurrent / 100000).toFixed(1)}L` : '--'}
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
                  {dscrCurrent > 0 ? `${dscrCurrent.toFixed(1)}x` : '--'}
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
                  {currentRatioCurrent > 0 ? `${currentRatioCurrent.toFixed(1)}x` : '--'}
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
              {riskItems.length === 0 && (
                <p style={{ color: '#64748B' }} className="text-xs">
                  No dynamic risk drivers available yet for this application snapshot.
                </p>
              )}
              {riskItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertTriangle size={16} style={{ color: '#F59E0B', marginTop: '2px' }} />
                  <div>
                    <p style={{ color: '#F1F5F9' }} className="text-sm">
                      Risk Driver {idx + 1}
                    </p>
                    <p style={{ color: '#64748B' }} className="text-xs">
                      {item}
                    </p>
                  </div>
                </div>
              ))}
              <div className="rounded p-2" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
                <p style={{ color: '#64748B' }} className="text-xs">
                  Fraud Network Cycles: <span style={{ color: cycleCount > 0 ? '#EF4444' : '#2DD4A0' }}>{cycleCount}</span>
                </p>
                <p style={{ color: '#64748B' }} className="text-xs mt-1">
                  {fraudSummary || 'No additional fraud summary from backend for this applicant.'}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div
            className="p-4 rounded-lg border-l-4"
            style={{
              backgroundColor: recommendationTone.bg,
              borderColor: recommendationTone.border,
            }}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 size={20} style={{ color: recommendationTone.icon, marginTop: '2px' }} />
              <div>
                <p style={{ color: '#F1F5F9' }} className="font-bold">
                  Recommendation: {decision}
                </p>
                <p style={{ color: '#64748B' }} className="text-sm mt-1">
                  Recommended loan: {gstinOutput?.recommended_loan_amount ? `₹${Number(gstinOutput.recommended_loan_amount).toLocaleString('en-IN')}` : 'n/a'};
                  tenure: {gstinOutput?.recommended_tenure_months ? `${gstinOutput.recommended_tenure_months} months` : 'n/a'}.
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
  const [assignedApplications, setAssignedApplications] = useState<ManagerApplicationCard[]>([]);
  const [pendingApplications, setPendingApplications] = useState<ManagerApplicationCard[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [chatMessages, setChatMessages] = useState<StoredChatMessage[]>([]);
  const [managerReply, setManagerReply] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ name: string; pages: number; url: string } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient || typeof window === 'undefined') {
      return;
    }

    const mapScopedApplications = (records: StoredAssignedApplication[]): ManagerApplicationCard[] =>
      records.map((app) => ({
        id: app.id,
        borrowerEmail: app.borrowerEmail,
        borrowerName: app.borrowerName,
        managerEmail: app.managerEmail,
        managerName: app.managerName,
        assignmentStatus: app.assignmentStatus,
        acceptedAt: app.acceptedAt,
        createdAt: app.createdAt,
        companyName: app.companyName,
        loanAmount: Number(app.loanAmount || 0),
        riskLevel: app.riskLevel || 'medium',
        currentStage: app.currentStage || 'submitted',
        credibilityScore: Number(app.credibilityScore || 0),
        updatedAt: app.updatedAt,
        scoringSummary: (app as any).scoringSummary,
        tabAnalysis: (app as any).tabAnalysis,
        backendScoring: app.backendScoring,
        documents: app.documents,
      }));

    const loadApplications = async () => {
      const managerEmail = state.currentUser.email?.toLowerCase();
      let bestAssigned: ManagerApplicationCard[] = [];
      let bestPending: ManagerApplicationCard[] = [];
      let bestScore = -1;

      const getCandidateScore = (records: ManagerApplicationCard[]) => {
        if (!records.length) {
          return 0;
        }

        const scoredCount = records.filter((app) => {
          const summary = app.scoringSummary;
          const backend = app.backendScoring as Record<string, unknown> | undefined;
          return Boolean(
            summary?.risk_category ||
            summary?.risk_band ||
            summary?.final_score !== undefined ||
            (backend && (backend.gstinResult || backend.scoreResult))
          );
        }).length;

        // Prefer sources that contain more assigned applications with scoring data.
        return records.length * 100 + scoredCount;
      };

      for (const base of API_BASE_CANDIDATES) {
        try {
          const pendingResponsePromise = fetch(`${base}/applications/pending`);
          const assignedResponsePromise = managerEmail
            ? fetch(`${base}/applications/manager/${encodeURIComponent(managerEmail)}/dashboard`)
            : Promise.resolve(null);

          const [assignedResponse, pendingResponse] = await Promise.all([
            assignedResponsePromise,
            pendingResponsePromise,
          ]);

          if ((assignedResponse === null || assignedResponse.ok) && pendingResponse.ok) {
            const [assignedData, pendingData] = await Promise.all([
              assignedResponse ? assignedResponse.json() : Promise.resolve({ applications: [] }),
              pendingResponse.json(),
            ]);
            const serverAssigned = mapScopedApplications((assignedData?.applications || []) as StoredAssignedApplication[]);
            const serverPending = mapScopedApplications((pendingData?.applications || []) as StoredAssignedApplication[]);

            const candidateScore = getCandidateScore(serverAssigned);
            if (candidateScore > bestScore) {
              bestScore = candidateScore;
              bestAssigned = serverAssigned;
              bestPending = serverPending;
            }

            // Keep scanning all candidates and pick the most complete dataset.
          }
        } catch {
          // Try next backend candidate.
        }
      }

      if (bestScore >= 0) {
        setAssignedApplications(bestAssigned);
        setPendingApplications(bestPending);

        if (bestAssigned.length && !bestAssigned.find((app) => app.id === selectedAppId)) {
          setSelectedAppId(bestAssigned[0].id);
        }
        return;
      }

      try {
        const raw = window.localStorage.getItem(APPLICATION_ASSIGNMENTS_KEY);
        const allApplications = raw ? (JSON.parse(raw) as StoredAssignedApplication[]) : [];
        const scopedApplications = managerEmail
          ? mapScopedApplications(
              allApplications.filter((app) => (app.managerEmail || '').toLowerCase() === managerEmail),
            )
          : [];
        const localPendingApplications = mapScopedApplications(
          allApplications.filter(
            (app) => app.assignmentStatus === 'pending' || (!app.managerEmail && app.assignmentStatus !== 'accepted'),
          ),
        );
        setAssignedApplications(scopedApplications);
        setPendingApplications(localPendingApplications);
        if (scopedApplications.length && !scopedApplications.find((app) => app.id === selectedAppId)) {
          setSelectedAppId(scopedApplications[0].id);
        }
      } catch {
        setAssignedApplications([]);
        setPendingApplications([]);
      }
    };

    void loadApplications();
  }, [isClient, state.currentUser.email, refreshTick]);

  const handleAcceptRequest = async (applicationId: string) => {
    const managerEmail = state.currentUser.email?.toLowerCase();
    if (!managerEmail || acceptingId) {
      return;
    }

    setAcceptingId(applicationId);

    try {
      let accepted = false;

      for (const base of API_BASE_CANDIDATES) {
        try {
          const response = await fetch(`${base}/applications/accept/${encodeURIComponent(applicationId)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              manager_email: managerEmail,
              manager_name: state.currentUser.name || 'Credit Manager',
            }),
          });

          if (!response.ok) {
            continue;
          }

          accepted = true;

          const assignedResponse = await fetch(`${base}/applications/manager/${encodeURIComponent(managerEmail)}/dashboard`);
          const pendingResponse = await fetch(`${base}/applications/pending`);

          if (assignedResponse.ok && pendingResponse.ok) {
            const [assignedData, pendingData] = await Promise.all([
              assignedResponse.json(),
              pendingResponse.json(),
            ]);

            const mapScopedApplications = (records: StoredAssignedApplication[]): ManagerApplicationCard[] =>
              records.map((app) => ({
                id: app.id,
                borrowerEmail: app.borrowerEmail,
                borrowerName: app.borrowerName,
                managerEmail: app.managerEmail,
                managerName: app.managerName,
                assignmentStatus: app.assignmentStatus,
                acceptedAt: app.acceptedAt,
                createdAt: app.createdAt,
                companyName: app.companyName,
                loanAmount: Number(app.loanAmount || 0),
                riskLevel: app.riskLevel || 'medium',
                currentStage: app.currentStage || 'submitted',
                credibilityScore: Number(app.credibilityScore || 0),
                updatedAt: app.updatedAt,
                scoringSummary: (app as any).scoringSummary,
                tabAnalysis: (app as any).tabAnalysis,
                backendScoring: app.backendScoring,
                documents: app.documents,
              }));

            const serverAssigned = mapScopedApplications((assignedData?.applications || []) as StoredAssignedApplication[]);
            const serverPending = mapScopedApplications((pendingData?.applications || []) as StoredAssignedApplication[]);

            setAssignedApplications(serverAssigned);
            setPendingApplications(serverPending);
          }

          break;
        } catch {
          // Try next backend candidate.
        }
      }

      if (!accepted) {
        throw new Error('accept_failed');
      }

      setSelectedAppId(applicationId);
    } catch {
      // Ignore and keep existing list if accept fails.
    } finally {
      setAcceptingId(null);
    }
  };

  const loadChatMessages = async (applicationId: string, borrowerEmail?: string, companyName?: string) => {
    if (!applicationId || typeof window === 'undefined') {
      setChatMessages([]);
      return;
    }

    for (const base of CHAT_API_BASES) {
      try {
        const response = await fetch(`${base}/applications/${encodeURIComponent(applicationId)}/messages`);
        if (!response.ok) {
          continue;
        }
        const data = await response.json();
        const messages = Array.isArray(data?.messages) ? data.messages : [];
        const sorted = messages
          .sort((a: StoredChatMessage, b: StoredChatMessage) => String(b.timestamp).localeCompare(String(a.timestamp)));
        setChatMessages(sorted);
        return;
      } catch {
        // Try next backend candidate.
      }
    }

    try {
      const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const scoped = list
        .filter((item: StoredChatMessage) => {
          const idMatch = item.applicationId === applicationId;
          const emailMatch = borrowerEmail && item.borrowerEmail
            ? String(item.borrowerEmail).toLowerCase() === String(borrowerEmail).toLowerCase()
            : false;
          const companyMatch = companyName && item.companyName
            ? String(item.companyName).toLowerCase() === String(companyName).toLowerCase()
            : false;
          return Boolean(idMatch || emailMatch || companyMatch);
        })
        .sort((a: StoredChatMessage, b: StoredChatMessage) => String(b.timestamp).localeCompare(String(a.timestamp)));
      setChatMessages(scoped);
    } catch {
      setChatMessages([]);
    }
  };

  const handleSendManagerReply = async () => {
    const content = managerReply.trim();
    if (!content || !selectedAppId || typeof window === 'undefined') {
      return;
    }

    const selectedForReply = assignedApplications.find((app) => app.id === selectedAppId);

    const newItem: StoredChatMessage = {
      id: Date.now(),
      applicationId: selectedAppId,
      senderRole: 'manager',
      senderName: state.currentUser.name || 'Manager',
      borrowerEmail: selectedForReply?.borrowerEmail,
      companyName: selectedForReply?.companyName,
      message: content,
      timestamp: new Date().toLocaleString(),
    };

    let apiSaved = false;
    for (const base of CHAT_API_BASES) {
      try {
        const response = await fetch(`${base}/applications/${encodeURIComponent(selectedAppId)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_role: 'manager',
            sender_name: state.currentUser.name || 'Manager',
            message: content,
            borrower_email: selectedForReply?.borrowerEmail || null,
            company_name: selectedForReply?.companyName || null,
          }),
        });

        if (response.ok) {
          apiSaved = true;
          break;
        }
      } catch {
        // Try next backend candidate.
      }
    }

    if (!apiSaved) {
      // Keep local fallback for resilience.
    }

    try {
      const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([newItem, ...list]));
    } catch {
      // Keep manager UI usable even if local storage write fails.
    }

    setManagerReply('');
    void loadChatMessages(selectedAppId, selectedForReply?.borrowerEmail, selectedForReply?.companyName);
  };

  const selectedAssignedApplication = assignedApplications.find((app) => app.id === selectedAppId);
  const backendScoring = selectedAssignedApplication?.backendScoring || state.formData.backendScoring || {};
  const scoringSummary = selectedAssignedApplication?.scoringSummary || {};
  const gstinResult = backendScoring.gstinResult;
  const scoreResult = backendScoring.scoreResult;
  const extractedPayload = backendScoring.extractedPayload || {};
  const processedDocuments = backendScoring.processedDocuments || [];
  const scoreOutput = scoreResult as {
    rule_score?: number;
    pd?: number;
    final_score?: number;
    risk_category?: string;
    decision?: string;
  } | undefined;
  const gstinOutput = gstinResult as {
    credit_score?: number;
    risk_band?: string;
    probability_of_default?: number;
    recommended_loan_amount?: number;
    recommended_tenure_months?: number;
    top_reasons?: string[];
  } | undefined;

  const resolvedScoreOutput = {
    pd: scoringSummary.pd ?? scoreOutput?.pd,
    final_score: scoringSummary.final_score ?? scoreOutput?.final_score,
    decision: scoringSummary.decision ?? scoreOutput?.decision,
    risk_category: scoringSummary.risk_category ?? scoreOutput?.risk_category,
  };

  const resolvedGstinOutput = {
    credit_score: scoringSummary.credit_score ?? gstinOutput?.credit_score,
    risk_band: scoringSummary.risk_band ?? gstinOutput?.risk_band,
    probability_of_default: scoringSummary.probability_of_default ?? gstinOutput?.probability_of_default,
    recommended_loan_amount: scoringSummary.recommended_loan_amount ?? gstinOutput?.recommended_loan_amount,
    recommended_tenure_months: scoringSummary.recommended_tenure_months ?? gstinOutput?.recommended_tenure_months,
    top_reasons: scoringSummary.top_reasons || gstinOutput?.top_reasons || [],
  };

  useEffect(() => {
    if (state.applicationState.applicationId) {
      setSelectedAppId(state.applicationState.applicationId);
    }
  }, [state.applicationState.applicationId]);

  useEffect(() => {
    if (!isClient || !selectedAppId) {
      return;
    }

    const selectedForChat = assignedApplications.find((app) => app.id === selectedAppId);
    void loadChatMessages(selectedAppId, selectedForChat?.borrowerEmail, selectedForChat?.companyName);
  }, [isClient, selectedAppId, refreshTick, assignedApplications]);

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

  const applications = assignedApplications.length
    ? assignedApplications
    : liveApplication
      ? [liveApplication]
      : [];
  const selectedApp = applications.find((app) => app.id === selectedAppId) || liveApplication;

  const monthlyRevenue = Number(extractedPayload.monthly_revenue || 0);
  const totalDebt = Number(extractedPayload.total_debt || 0);
  const monthlyEmi = Number(extractedPayload.monthly_emi || 0);
  const businessAgeMonths = Number(extractedPayload.business_age_months || 0);
  const businessAgeYears = businessAgeMonths > 0 ? businessAgeMonths / 12 : 0;
  const gstCompliant = Boolean(extractedPayload.gst_compliant);
  const hasDisputes = Boolean(extractedPayload.has_disputes);
  const recommendedLoan = Number(gstinResult?.recommended_loan_amount || state.applicationState.loanAmount || 0);
  const baseProfit = monthlyRevenue > 0 ? monthlyRevenue * 0.22 : 0;
  const dscrCurrent = scoreResult ? Number((1.1 + Math.max(scoreResult.final_score - 50, 0) / 40).toFixed(1)) : 0;
  const currentRatioCurrent = totalDebt && monthlyRevenue
    ? Number((1.2 + monthlyRevenue / Math.max(totalDebt, 1) / 2).toFixed(1))
    : 0;
  const topReasonList = (resolvedGstinOutput.top_reasons || []).filter(Boolean);
  const profileLabel = selectedAssignedApplication?.companyName || liveApplication?.companyName || 'the business';

  const fallbackCredibilityReasoning = [
    `${profileLabel} shows a business vintage of ${businessAgeYears.toFixed(1)} years with current risk level tagged as ${(resolvedGstinOutput.risk_band || 'Awaiting scoring').toLowerCase()}.`,
    `GST compliance is ${gstCompliant ? 'confirmed' : 'not confirmed'} and dispute history is ${hasDisputes ? 'present' : 'not indicated'} in extracted records.`,
    topReasonList[0] || 'Primary model driver is pending because explainability reasons are currently limited for this application.',
  ];

  const debtToRevenueRatio = monthlyRevenue > 0 ? totalDebt / Math.max(monthlyRevenue * 12, 1) : 0;
  const emiToRevenuePct = monthlyRevenue > 0 ? (monthlyEmi / Math.max(monthlyRevenue, 1)) * 100 : 0;
  const fallbackFinancialReasoning = [
    `Monthly revenue is estimated at ₹${monthlyRevenue.toLocaleString('en-IN')} with EMI load around ${emiToRevenuePct.toFixed(1)}% of monthly inflow.`,
    `Coverage metrics indicate DSCR near ${dscrCurrent.toFixed(1)}x and current ratio near ${currentRatioCurrent.toFixed(1)}x for this case.`,
    `Debt to annualized revenue is ${debtToRevenueRatio.toFixed(2)}, suggesting ${debtToRevenueRatio < 0.7 ? 'moderate' : 'elevated'} leverage pressure.`,
  ];

  const fallbackIndustryReasoning = [
    `${profileLabel} is currently benchmarked against ${(resolvedGstinOutput.risk_band || 'unrated').toLowerCase()} profile peers in the alternative-signal scoring set.`,
    topReasonList[1] || 'Sector confidence remains moderate until richer transaction telemetry is available for this application.',
    `Competitive stance is assessed as ${resolvedGstinOutput.risk_band ? `${resolvedGstinOutput.risk_band.toLowerCase()} segment behavior` : 'awaiting benchmark update'}.`,
  ];

  const fallbackSiteFindings = processedDocuments.length
    ? [
        `Underwriting review includes ${processedDocuments.length} processed documents for ${profileLabel}.`,
        `Key document coverage includes ${processedDocuments
          .slice(0, 3)
          .map((doc: { document_type?: string }) => doc.document_type || 'document')
          .join(', ')}.`,
        `Latest review timestamp is ${selectedAssignedApplication?.updatedAt || state.applicationState.lastUpdated || 'not available'}.`,
      ]
    : [
        `No processed document summaries are available yet for ${profileLabel}.`,
        'Site review narrative will improve after extraction and verification stages complete.',
      ];

  const fallbackRiskItems = [
    `Probability of default is ${(Number(resolvedGstinOutput.probability_of_default || 0) * 100).toFixed(1)}% for the current application snapshot.`,
    topReasonList[2] || 'Key model risk drivers are currently sparse and should be reviewed manually.',
    `Collateral cover is estimated at ${recommendedLoan ? (Math.round(recommendedLoan * 1.4) / Math.max(recommendedLoan, 1)).toFixed(1) : '0.0'}x against the recommended loan amount.`,
  ];

  const computedAnalysis = {
    credibility: {
      score: Math.round(Number(resolvedScoreOutput.final_score || selectedAssignedApplication?.credibilityScore || liveApplication?.credibilityScore || 0)),
      reasoning: topReasonList.length ? topReasonList : fallbackCredibilityReasoning,
    },
    financial: {
      ebitda: {
        current: Math.round(baseProfit),
        trend: monthlyRevenue > 0
          ? [0.72, 0.8, 0.88, 0.94, 1].map((factor) => Math.round(baseProfit * factor))
          : [],
      },
      dscr: {
        current: dscrCurrent,
        trend: scoreResult ? [0.9, 1.0, 1.15, 1.25, 1.35].map((factor) => Number((factor + Math.max(scoreResult.final_score - 60, 0) / 100).toFixed(1))) : [],
      },
      currentRatio: {
        current: currentRatioCurrent,
        trend: totalDebt && monthlyRevenue
          ? [0.82, 0.9, 0.95, 1.0, 1.08].map((factor) => Number(((1.2 + monthlyRevenue / Math.max(totalDebt, 1) / 2) * factor).toFixed(1)))
          : [],
      },
      reasoning: fallbackFinancialReasoning,
    },
    industry: {
      sector: gstinResult ? 'MSME Alternative Signal Profile' : 'No sector data yet',
      marketSize: gstinResult ? 'Mocked live GST + UPI + e-way signal universe' : 'Awaiting scoring input',
      growthRate: resolvedGstinOutput.risk_band || 'Awaiting scoring',
      competitiveBenchmark: resolvedGstinOutput.risk_band ? `${resolvedGstinOutput.risk_band} segment` : 'Awaiting benchmark',
      reasoning: topReasonList.length ? topReasonList : fallbackIndustryReasoning,
    },
    siteReview: {
      visitDate: selectedAssignedApplication?.updatedAt || state.applicationState.lastUpdated || '',
      findings: fallbackSiteFindings,
    },
    risk: {
      probabilityOfDefault: Math.round((resolvedGstinOutput.probability_of_default || 0) * 100),
      keyRisks: gstinResult
        ? (resolvedGstinOutput.top_reasons || []).slice(0, 3)
        : fallbackRiskItems,
      collateralValue: Math.round(recommendedLoan * 1.4),
      loanAmount: recommendedLoan,
    },
  };
  const aiAnalysis = (() => {
    const base = selectedAssignedApplication?.tabAnalysis || computedAnalysis;

    const baseCredibilityReasoning = Array.isArray(base?.credibility?.reasoning)
      ? base.credibility.reasoning.filter(Boolean)
      : [];
    const baseIndustryReasoning = Array.isArray(base?.industry?.reasoning)
      ? base.industry.reasoning.filter(Boolean)
      : [];
    const baseSiteFindings = Array.isArray(base?.siteReview?.findings)
      ? base.siteReview.findings.filter(Boolean)
      : [];
    const baseRiskItems = Array.isArray(base?.risk?.keyRisks)
      ? base.risk.keyRisks.filter(Boolean)
      : [];

    const fallbackLoanAmount = Number(selectedAssignedApplication?.loanAmount || liveApplication?.loanAmount || mockAIAnalysis.risk.loanAmount || 500000);
    const fallbackCollateral = Math.round(fallbackLoanAmount * 1.4);

    return {
      credibility: {
        score: Number(base?.credibility?.score || computedAnalysis.credibility.score || 0),
        reasoning: baseCredibilityReasoning.length ? baseCredibilityReasoning : computedAnalysis.credibility.reasoning,
      },
      financial: {
        ebitda: {
          current: Number(base?.financial?.ebitda?.current || computedAnalysis.financial.ebitda.current || mockAIAnalysis.financial.ebitda.current),
          trend: Array.isArray(base?.financial?.ebitda?.trend) && base.financial.ebitda.trend.length
            ? base.financial.ebitda.trend
            : (computedAnalysis.financial.ebitda.trend.length ? computedAnalysis.financial.ebitda.trend : mockAIAnalysis.financial.ebitda.trend),
        },
        dscr: {
          current: Number(base?.financial?.dscr?.current || computedAnalysis.financial.dscr.current || mockAIAnalysis.financial.dscr.current),
          trend: Array.isArray(base?.financial?.dscr?.trend) && base.financial.dscr.trend.length
            ? base.financial.dscr.trend
            : (computedAnalysis.financial.dscr.trend.length ? computedAnalysis.financial.dscr.trend : mockAIAnalysis.financial.dscr.trend),
        },
        currentRatio: {
          current: Number(base?.financial?.currentRatio?.current || computedAnalysis.financial.currentRatio.current || mockAIAnalysis.financial.currentRatio.current),
          trend: Array.isArray(base?.financial?.currentRatio?.trend) && base.financial.currentRatio.trend.length
            ? base.financial.currentRatio.trend
            : (computedAnalysis.financial.currentRatio.trend.length ? computedAnalysis.financial.currentRatio.trend : mockAIAnalysis.financial.currentRatio.trend),
        },
        reasoning: Array.isArray(base?.financial?.reasoning) && base.financial.reasoning.length
          ? base.financial.reasoning.filter(Boolean)
          : computedAnalysis.financial.reasoning,
      },
      industry: {
        sector: base?.industry?.sector || computedAnalysis.industry.sector || mockAIAnalysis.industry.sector,
        marketSize: base?.industry?.marketSize || computedAnalysis.industry.marketSize || mockAIAnalysis.industry.marketSize,
        growthRate: base?.industry?.growthRate || computedAnalysis.industry.growthRate || mockAIAnalysis.industry.growthRate,
        competitiveBenchmark: base?.industry?.competitiveBenchmark || computedAnalysis.industry.competitiveBenchmark || mockAIAnalysis.industry.competitiveBenchmark,
        reasoning: baseIndustryReasoning.length ? baseIndustryReasoning : computedAnalysis.industry.reasoning,
      },
      siteReview: {
        visitDate: base?.siteReview?.visitDate || computedAnalysis.siteReview.visitDate || new Date().toISOString(),
        findings: baseSiteFindings.length ? baseSiteFindings : computedAnalysis.siteReview.findings,
      },
      risk: {
        probabilityOfDefault: Number(base?.risk?.probabilityOfDefault || computedAnalysis.risk.probabilityOfDefault || mockAIAnalysis.risk.probabilityOfDefault),
        keyRisks: baseRiskItems.length ? baseRiskItems : computedAnalysis.risk.keyRisks,
        collateralValue: Number(base?.risk?.collateralValue || computedAnalysis.risk.collateralValue || fallbackCollateral),
        loanAmount: Number(base?.risk?.loanAmount || computedAnalysis.risk.loanAmount || fallbackLoanAmount),
      },
    };
  })();
  const sourceDocuments = selectedAssignedApplication?.documents && selectedAssignedApplication.documents.length
    ? selectedAssignedApplication.documents
    : state.documents;

  const rawDocuments = sourceDocuments.length
    ? sourceDocuments.map((doc: any) => ({
        name: doc.name,
        pages: 1,
      }))
    : [];

  const getPreviewUrl = (name: string) => `/mock_pdfs/${encodeURIComponent(name)}`;

  const processedDocumentPreview = gstinResult
    ? {
        gstin: gstinResult.gstin,
        credit_score: gstinResult.credit_score,
        risk_band: gstinResult.risk_band,
        risk_score: gstinResult.risk_score,
        probability_of_default: gstinResult.probability_of_default,
        risk_category: gstinResult.risk_category,
        recommended_loan_amount: gstinResult.recommended_loan_amount,
        recommended_tenure_months: gstinResult.recommended_tenure_months,
        top_reasons: gstinResult.top_reasons,
        score_result: scoreResult || null,
        extracted_payload: extractedPayload || null,
        documents: processedDocuments,
      }
    : {
        score_result: scoreResult || null,
        extracted_payload: extractedPayload || null,
        backend_scoring: backendScoring || null,
        documents: processedDocuments,
      };

  const selectedApplicationReport = selectedAssignedApplication
    ? {
        application: {
          id: selectedAssignedApplication.id,
          borrower_name: selectedAssignedApplication.borrowerName || 'N/A',
          borrower_email: selectedAssignedApplication.borrowerEmail || 'N/A',
          company_name: selectedAssignedApplication.companyName,
          manager_name: selectedAssignedApplication.managerName || 'N/A',
          manager_email: selectedAssignedApplication.managerEmail || 'N/A',
          assignment_status: selectedAssignedApplication.assignmentStatus || 'accepted',
          accepted_at: selectedAssignedApplication.acceptedAt || null,
          created_at: selectedAssignedApplication.createdAt || null,
          updated_at: selectedAssignedApplication.updatedAt || null,
          current_stage: selectedAssignedApplication.currentStage,
          risk_level: selectedAssignedApplication.riskLevel,
          loan_amount: selectedAssignedApplication.loanAmount,
        },
        scoring_summary: selectedAssignedApplication.scoringSummary || null,
        backend_scoring: backendScoring || null,
        documents: sourceDocuments || [],
      }
    : null;

  const formatDateLabel = (value?: string | null) => {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  };

  const formatDateOnlyLabel = (value?: string | null) => {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString();
  };

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
        <button
          onClick={() => setRefreshTick((value) => value + 1)}
          className="w-full mb-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{
            backgroundColor: '#1E2A3A',
            color: '#D4A843',
            border: '1px solid #1E2A3A',
          }}
        >
          Refresh Queue
        </button>

        {pendingApplications.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold uppercase" style={{ color: '#64748B' }}>
              Pending Requests
            </p>
            {pendingApplications.map((app) => (
              <div
                key={`pending-${app.id}`}
                className="w-full p-3 rounded-lg border"
                style={{
                  backgroundColor: '#141929',
                  borderColor: '#1E2A3A',
                }}
              >
                <p style={{ color: '#F1F5F9' }} className="font-semibold text-sm truncate">
                  {app.companyName}
                </p>
                <p style={{ color: '#D4A843' }} className="font-mono text-xs mt-1">
                  ₹{(app.loanAmount / 100000).toFixed(1)}L
                </p>
                <button
                  onClick={() => void handleAcceptRequest(app.id)}
                  disabled={Boolean(acceptingId)}
                  className="w-full mt-3 py-1.5 rounded text-xs font-semibold transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: '#D4A843',
                    color: '#0B0F1A',
                  }}
                >
                  {acceptingId === app.id ? 'Accepting...' : 'Accept Request'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!pendingApplications.length && (
          <p className="text-xs mb-4" style={{ color: '#64748B' }}>
            No pending requests right now.
          </p>
        )}

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
          {['credibility', 'financial', 'industry', 'siteReview', 'risk', 'chat'].map((tab) => (
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
          {selectedApplicationReport && (
            <div
              className="rounded-lg p-4 animate-in fade-in duration-300"
              style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p style={{ color: '#64748B' }} className="text-xs uppercase">
                  Accepted Application Report
                </p>
                <p style={{ color: '#D4A843' }} className="text-xs font-mono">
                  {selectedAssignedApplication?.id}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <p style={{ color: '#64748B' }} className="text-xs">Borrower</p>
                  <p style={{ color: '#F1F5F9' }} className="text-sm font-semibold truncate">
                    {selectedAssignedApplication?.borrowerName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#64748B' }} className="text-xs">Manager</p>
                  <p style={{ color: '#F1F5F9' }} className="text-sm font-semibold truncate">
                    {selectedAssignedApplication?.managerName || state.currentUser.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#64748B' }} className="text-xs">Status</p>
                  <p style={{ color: '#2DD4A0' }} className="text-sm font-semibold uppercase">
                    {selectedAssignedApplication?.assignmentStatus || 'accepted'}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#64748B' }} className="text-xs">Documents</p>
                  <p style={{ color: '#F1F5F9' }} className="text-sm font-semibold">
                    {sourceDocuments.length}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded p-3" style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}>
                  <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">Application Details</p>
                  <div className="space-y-1 text-xs">
                    <p style={{ color: '#F1F5F9' }}>Borrower Email: {selectedApplicationReport.application.borrower_email}</p>
                    <p style={{ color: '#F1F5F9' }}>Manager Email: {selectedApplicationReport.application.manager_email}</p>
                    <p style={{ color: '#F1F5F9' }}>Stage: {selectedApplicationReport.application.current_stage}</p>
                    <p style={{ color: '#F1F5F9' }}>Loan: ₹{Number(selectedApplicationReport.application.loan_amount || 0).toLocaleString('en-IN')}</p>
                    <p style={{ color: '#F1F5F9' }}>Accepted At: {formatDateLabel(selectedApplicationReport.application.accepted_at)}</p>
                  </div>
                </div>
                <div className="rounded p-3" style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}>
                  <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">Scoring Snapshot</p>
                  <div className="space-y-1 text-xs">
                    <p style={{ color: '#F1F5F9' }}>PD: {selectedApplicationReport.scoring_summary?.pd !== undefined ? `${(Number(selectedApplicationReport.scoring_summary.pd) * 100).toFixed(2)}%` : '--'}</p>
                    <p style={{ color: '#F1F5F9' }}>Final Score: {selectedApplicationReport.scoring_summary?.final_score !== undefined ? Number(selectedApplicationReport.scoring_summary.final_score).toFixed(2) : '--'}</p>
                    <p style={{ color: '#F1F5F9' }}>Decision: {selectedApplicationReport.scoring_summary?.decision || '--'}</p>
                    <p style={{ color: '#F1F5F9' }}>Risk: {selectedApplicationReport.scoring_summary?.risk_category || '--'}</p>
                    <p style={{ color: '#F1F5F9' }}>Credit Score: {selectedApplicationReport.scoring_summary?.credit_score ?? '--'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credibility' && (
            <div>
              {(resolvedScoreOutput.final_score !== undefined || resolvedGstinOutput.credit_score !== undefined) && (
                <div
                  className="rounded-lg p-4 mb-4 animate-in fade-in duration-300"
                  style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
                >
                  <p style={{ color: '#64748B' }} className="text-xs uppercase mb-3">
                    Backend Scoring Output
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p style={{ color: '#64748B' }} className="text-xs">Final Score</p>
                      <p style={{ color: '#D4A843' }} className="font-mono font-bold">
                        {resolvedScoreOutput.final_score !== undefined ? Number(resolvedScoreOutput.final_score).toFixed(2) : '--'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#64748B' }} className="text-xs">PD</p>
                      <p style={{ color: '#F1F5F9' }} className="font-mono font-bold">
                        {resolvedScoreOutput.pd !== undefined ? `${(Number(resolvedScoreOutput.pd) * 100).toFixed(2)}%` : '--'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#64748B' }} className="text-xs">Decision</p>
                      <p style={{ color: '#2DD4A0' }} className="font-semibold">
                        {resolvedScoreOutput.decision || '--'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#64748B' }} className="text-xs">Risk Category</p>
                      <p style={{ color: '#F59E0B' }} className="font-semibold">
                        {resolvedScoreOutput.risk_category || '--'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#64748B' }} className="text-xs">Credit Score</p>
                      <p style={{ color: '#F1F5F9' }} className="font-mono font-bold">
                        {resolvedGstinOutput.credit_score !== undefined ? resolvedGstinOutput.credit_score : '--'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#64748B' }} className="text-xs">Risk Band</p>
                      <p style={{ color: '#F1F5F9' }} className="font-semibold">
                        {resolvedGstinOutput.risk_band || '--'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#64748B' }} className="text-xs">Recommended Loan</p>
                      <p style={{ color: '#F1F5F9' }} className="font-mono font-bold">
                        {resolvedGstinOutput.recommended_loan_amount !== undefined
                          ? `₹${Number(resolvedGstinOutput.recommended_loan_amount).toLocaleString('en-IN')}`
                          : '--'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#64748B' }} className="text-xs">Tenure</p>
                      <p style={{ color: '#F1F5F9' }} className="font-mono font-bold">
                        {resolvedGstinOutput.recommended_tenure_months !== undefined
                          ? `${Number(resolvedGstinOutput.recommended_tenure_months)} months`
                          : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                {aiAnalysis.financial.reasoning.map((step, idx) => (
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
                  {isClient ? formatDateOnlyLabel(aiAnalysis.siteReview.visitDate) : 'Loading...'}
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
            <div className="space-y-6">
              {(() => {
                const collateralValue = Number(aiAnalysis.risk.collateralValue || 0);
                const loanAmount = Number(aiAnalysis.risk.loanAmount || 0);
                const ltvRatio = loanAmount > 0 ? collateralValue / loanAmount : null;

                return (
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
                      ₹{(collateralValue / 100000).toFixed(1)}L
                    </p>
                    <p style={{ color: '#64748B' }} className="text-xs mt-1">
                      {ltvRatio !== null ? `${ltvRatio.toFixed(1)}x LTV` : '--'}
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
                );
              })()}


            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
              >
                <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
                  Application Chat
                </p>
                <p style={{ color: '#F1F5F9' }} className="text-sm">
                  Thread for: {selectedApp?.companyName || 'No application selected'} ({selectedAppId || 'N/A'})
                </p>
              </div>

              <div
                className="rounded-lg p-4 space-y-3 max-h-[360px] overflow-y-auto"
                style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
              >
                {!chatMessages.length && (
                  <p style={{ color: '#64748B' }} className="text-sm">
                    No messages yet for this application.
                  </p>
                )}

                {chatMessages.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: item.senderRole === 'manager' ? 'rgba(212, 168, 67, 0.16)' : 'rgba(30, 42, 58, 0.9)',
                      border: '1px solid #1E2A3A',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p style={{ color: '#D4A843' }} className="text-xs font-semibold uppercase">
                        {item.senderName} ({item.senderRole})
                      </p>
                      <p style={{ color: '#94A3B8' }} className="text-xs">{item.timestamp}</p>
                    </div>
                    {item.subject ? (
                      <p style={{ color: '#F1F5F9' }} className="text-sm font-semibold">{item.subject}</p>
                    ) : null}
                    <p style={{ color: '#F1F5F9' }} className="text-sm mt-1">{item.message}</p>
                    {item.attachmentName ? (
                      <p style={{ color: '#94A3B8' }} className="text-xs mt-2">Attachment: {item.attachmentName}</p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <textarea
                  value={managerReply}
                  onChange={(e) => setManagerReply(e.target.value)}
                  rows={3}
                  placeholder="Reply to borrower..."
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: '#0B0F1A',
                    borderColor: '#1E2A3A',
                    color: '#F1F5F9',
                  }}
                />
                <button
                  onClick={handleSendManagerReply}
                  disabled={!managerReply.trim() || !selectedAppId}
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  style={{
                    backgroundColor: '#D4A843',
                    color: '#0B0F1A',
                  }}
                >
                  <Send size={14} />
                  Send Reply
                </button>
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
                    onClick={() => setPreviewDoc({ name: doc.name, pages: doc.pages, url: getPreviewUrl(doc.name) })}
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
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
                <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">Scoring Output</p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <p style={{ color: '#F1F5F9' }}>PD: {resolvedScoreOutput.pd !== undefined ? `${(Number(resolvedScoreOutput.pd) * 100).toFixed(2)}%` : '--'}</p>
                  <p style={{ color: '#F1F5F9' }}>Final Score: {resolvedScoreOutput.final_score !== undefined ? Number(resolvedScoreOutput.final_score).toFixed(2) : '--'}</p>
                  <p style={{ color: '#F1F5F9' }}>Decision: {resolvedScoreOutput.decision || '--'}</p>
                  <p style={{ color: '#F1F5F9' }}>Risk Category: {resolvedScoreOutput.risk_category || '--'}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
                <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">GSTIN and Recommendation</p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <p style={{ color: '#F1F5F9' }}>Credit Score: {resolvedGstinOutput.credit_score ?? '--'}</p>
                  <p style={{ color: '#F1F5F9' }}>Risk Band: {resolvedGstinOutput.risk_band || '--'}</p>
                  <p style={{ color: '#F1F5F9' }}>Recommended Loan: {resolvedGstinOutput.recommended_loan_amount !== undefined ? `₹${Number(resolvedGstinOutput.recommended_loan_amount).toLocaleString('en-IN')}` : '--'}</p>
                  <p style={{ color: '#F1F5F9' }}>Recommended Tenure: {resolvedGstinOutput.recommended_tenure_months !== undefined ? `${resolvedGstinOutput.recommended_tenure_months} months` : '--'}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
                <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">Top Reasons</p>
                <div className="flex flex-wrap gap-2">
                  {(resolvedGstinOutput.top_reasons || []).length ? (resolvedGstinOutput.top_reasons || []).map((reason, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#1E2A3A', color: '#D4A843' }}
                    >
                      {reason}
                    </span>
                  )) : (
                    <span className="text-xs" style={{ color: '#64748B' }}>No reasons available.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CAM Modal */}
      <CAMModal
        isOpen={showCAMModal}
        onClose={() => setShowCAMModal(false)}
        appData={selectedApp}
        analysis={aiAnalysis}
        scoreOutput={resolvedScoreOutput}
        gstinOutput={resolvedGstinOutput}
      />

      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="w-full max-w-xl rounded-lg p-5"
            style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p style={{ color: '#F1F5F9' }} className="font-semibold">Document Preview</p>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-sm px-3 py-1 rounded"
                style={{ backgroundColor: '#1E2A3A', color: '#D4A843' }}
              >
                Close
              </button>
            </div>
            <div className="rounded-lg p-4" style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}>
              <p style={{ color: '#F1F5F9' }} className="text-sm font-mono">{previewDoc.name}</p>
              <p style={{ color: '#94A3B8' }} className="text-xs mt-1">{previewDoc.pages} page{previewDoc.pages > 1 ? 's' : ''}</p>
              <div className="mt-4 h-[420px] rounded overflow-hidden" style={{ border: '1px solid #1E2A3A' }}>
                <object data={previewDoc.url} type="application/pdf" width="100%" height="100%">
                  <div className="p-4">
                    <p style={{ color: '#64748B' }} className="text-xs">
                      PDF preview is unavailable in this browser context.
                    </p>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-xs"
                      style={{ color: '#D4A843' }}
                    >
                      Open document in new tab
                    </a>
                  </div>
                </object>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
