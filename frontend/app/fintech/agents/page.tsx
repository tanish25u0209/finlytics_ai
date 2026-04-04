'use client';

import { useAppContext } from '@/lib/AppContext';
import { useState, useEffect } from 'react';
import {
  Shield, BarChart3, AlertTriangle, Brain, CheckCircle2
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
const APPLICATION_ASSIGNMENTS_KEY = 'finserv-aim-applications';

// Mock agent statuses
const mockAgentStatuses = {
  compliance: {
    status: 'complete',
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    findings: 'All KYC documents verified and compliant with regulatory requirements.',
    completionPercent: 100,
  },
  financial: {
    status: 'running',
    lastRun: new Date(Date.now() - 1800000).toISOString(),
    findings: 'Analyzing financial statements and cash flow patterns. Processing...',
    completionPercent: 65,
  },
  fraud: {
    status: 'complete',
    lastRun: new Date(Date.now() - 7200000).toISOString(),
    findings: 'No anomalies detected. Transaction patterns are normal.',
    anomalyDetected: false,
    completionPercent: 100,
  },
  decision: {
    status: 'idle',
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    findings: 'Awaiting financial analysis completion.',
    completionPercent: 0,
  },
};

type DerivedAgentStatuses = {
  kyc: {
    status: 'running' | 'idle' | 'complete';
    lastRun: string;
    findings: string;
    completionPercent: number;
  };
  financial: {
    status: 'running' | 'idle' | 'complete';
    lastRun: string;
    findings: string;
    completionPercent: number;
  };
  fraud: {
    status: 'running' | 'idle' | 'complete';
    lastRun: string;
    findings: string;
    anomalyDetected: boolean;
    completionPercent: number;
  };
  decision: {
    status: 'running' | 'idle' | 'complete';
    lastRun: string;
    findings: string;
    completionPercent: number;
  };
};

const agentConfigs = [
  {
    key: 'compliance',
    name: 'Compliance & KYC Agent',
    icon: Shield,
    description: 'Identity verification and regulatory compliance',
  },
  {
    key: 'financial',
    name: 'Financial Analysis Agent',
    icon: BarChart3,
    description: 'Financial statements and cash flow analysis',
  },
  {
    key: 'fraud',
    name: 'Fraud Detection Agent',
    icon: AlertTriangle,
    description: 'Anomaly detection and fraud prevention',
  },
  {
    key: 'decision',
    name: 'Central Decision Agent',
    icon: Brain,
    description: 'Final credit decision and recommendation engine',
  },
];

const AgentCard = ({ config, status, isClient }) => {
  const Icon = config.icon;
  const isRunning = status.status === 'running';
  const isComplete = status.status === 'complete';
  const isAnomalyDetected = config.key === 'fraud' && status.anomalyDetected;
  const parsedLastRun = status.lastRun ? new Date(status.lastRun) : null;
  const hasValidLastRun = Boolean(parsedLastRun && !Number.isNaN(parsedLastRun.getTime()));

  const getStatusColor = () => {
    if (isRunning) return '#D4A843';
    if (isComplete) return '#2DD4A0';
    return '#64748B';
  };

  return (
    <div
      className="rounded-lg p-6 animate-in fade-in duration-300 relative overflow-hidden"
      style={{
        backgroundColor: '#141929',
        border: isRunning ? '2px solid #D4A843' : '1px solid #1E2A3A',
        boxShadow: isAnomalyDetected ? '0 0 20px rgba(245, 158, 11, 0.3)' : 'none',
      }}
    >
      {/* Anomaly Detected Banner */}
      {isAnomalyDetected && (
        <div
          className="absolute top-0 left-0 right-0 px-4 py-2 flex items-center gap-2 animate-in fade-in duration-300"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <AlertTriangle size={14} style={{ color: '#0B0F1A' }} />
          <span style={{ color: '#0B0F1A', fontSize: '12px', fontWeight: 'bold' }}>
            ANOMALY DETECTED
          </span>
        </div>
      )}

      <div style={{ paddingTop: isAnomalyDetected ? '40px' : '0' }}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="p-3 rounded-lg flex-shrink-0"
            style={{
              backgroundColor: getStatusColor() + '20',
            }}
          >
            <Icon size={24} style={{ color: getStatusColor() }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 style={{ color: '#F1F5F9' }} className="font-bold text-sm">
              {config.name}
            </h3>
            <p style={{ color: '#64748B' }} className="text-xs mt-1">
              {config.description}
            </p>
          </div>
          <div
            className="px-2 py-1 rounded-full text-xs font-bold flex-shrink-0"
            style={{
              backgroundColor: getStatusColor() + '20',
              color: getStatusColor(),
            }}
          >
            {status.status.toUpperCase()}
          </div>
        </div>

        {/* Findings */}
        <div
          className="mb-4 p-3 rounded-lg"
          style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}
        >
          <p style={{ color: '#F1F5F9' }} className="text-xs leading-relaxed">
            {status.findings}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: '#64748B' }} className="text-xs">
              Processing
            </span>
            <span style={{ color: '#D4A843' }} className="text-xs font-mono">
              {status.completionPercent}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#1E2A3A' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${status.completionPercent}%`,
                backgroundColor: getStatusColor(),
              }}
            />
          </div>
        </div>

        {/* Last Run */}
        <div
          className="p-3 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}
        >
          <span style={{ color: '#64748B' }} className="text-xs">
            Last Run
          </span>
          <span style={{ color: '#F1F5F9' }} className="text-xs font-mono">
            {isClient ? (hasValidLastRun ? parsedLastRun.toLocaleTimeString() : 'Not run yet') : 'Loading...'}
          </span>
        </div>

        {/* Special Indicator for Fraud */}
        {config.key === 'fraud' && (
          <div
            className="mt-4 p-2 rounded-lg flex items-center gap-2 text-xs"
            style={{
              backgroundColor: status.anomalyDetected
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(45, 212, 160, 0.1)',
            }}
          >
            {status.anomalyDetected ? (
              <>
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: '#EF4444' }}
                />
                <span style={{ color: '#EF4444', fontWeight: 'bold' }}>
                  Anomalies: Detected
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} style={{ color: '#2DD4A0' }} />
                <span style={{ color: '#2DD4A0' }}>Safe</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function AgentsPage() {
  const { state } = useAppContext();
  const [isClient, setIsClient] = useState(false);
  const [derivedAgentStatuses, setDerivedAgentStatuses] = useState<DerivedAgentStatuses | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<{ system_load_percent: number; health_label: string } | null>(null);

  const buildDerivedStatuses = (application: Record<string, unknown>): DerivedAgentStatuses => {
    const updatedAt = String(application.updatedAt || new Date().toISOString());
    const backendScoring = (application.backendScoring || {}) as Record<string, unknown>;
    const scoringSummary = (application.scoringSummary || {}) as Record<string, unknown>;
    const extractedPayload = (backendScoring.extractedPayload || {}) as Record<string, unknown>;
    const scoreResult = (backendScoring.scoreResult || {}) as Record<string, unknown>;
    const gstinResult = (backendScoring.gstinResult || {}) as Record<string, unknown>;
    const processedDocuments = Array.isArray(backendScoring.processedDocuments)
      ? (backendScoring.processedDocuments as unknown[])
      : [];

    const assignmentAccepted = String(application.assignmentStatus || '').toLowerCase() === 'accepted';
    const hasExtraction = Object.keys(extractedPayload).length > 0;
    const hasFinancial = processedDocuments.length > 0 || scoreResult.final_score !== undefined || scoringSummary.final_score !== undefined;
    const hasFraud = gstinResult.probability_of_default !== undefined || gstinResult.fraud_flag !== undefined || scoringSummary.probability_of_default !== undefined;
    const hasDecision = scoreResult.decision !== undefined || scoringSummary.decision !== undefined;

    const kycStatus = assignmentAccepted ? 'complete' : hasExtraction ? 'running' : 'idle';
    const financialStatus = hasFinancial ? 'complete' : hasExtraction ? 'running' : 'idle';
    const fraudStatus = hasFraud ? 'complete' : hasFinancial ? 'running' : 'idle';
    const decisionStatus = hasDecision ? 'complete' : (hasFinancial && hasFraud ? 'running' : 'idle');

    return {
      kyc: {
        status: kycStatus,
        lastRun: updatedAt,
        findings: assignmentAccepted
          ? 'KYC and assignment ownership verified for accepted application.'
          : 'KYC verification in progress for current application queue.',
        completionPercent: kycStatus === 'complete' ? 100 : kycStatus === 'running' ? 55 : 0,
      },
      financial: {
        status: financialStatus,
        lastRun: updatedAt,
        findings: hasFinancial
          ? 'Financial analysis populated from extracted payload and scoring outputs.'
          : 'Financial analysis is waiting for extraction/scoring inputs.',
        completionPercent: financialStatus === 'complete' ? 100 : financialStatus === 'running' ? 60 : 0,
      },
      fraud: {
        status: fraudStatus,
        lastRun: updatedAt,
        findings: hasFraud
          ? 'Fraud and risk signals evaluated from GSTIN/PD indicators.'
          : 'Fraud analysis will start after financial and GSTIN signals are available.',
        anomalyDetected: Boolean(gstinResult.fraud_flag),
        completionPercent: fraudStatus === 'complete' ? 100 : fraudStatus === 'running' ? 45 : 0,
      },
      decision: {
        status: decisionStatus,
        lastRun: updatedAt,
        findings: hasDecision
          ? `Decision status available: ${String(scoreResult.decision || scoringSummary.decision || 'computed')}.`
          : 'Decision agent is waiting for prerequisite analysis completion.',
        completionPercent: decisionStatus === 'complete' ? 100 : decisionStatus === 'running' ? 70 : 0,
      },
    };
  };

  const getNormalizedStatus = (status: string | undefined) => {
    if (status === 'running' || status === 'complete' || status === 'idle') {
      return status;
    }
    return 'idle';
  };

  const getSafeLastRun = (candidate: string | undefined, fallback: string) => {
    if (!candidate) {
      return fallback;
    }

    const parsed = new Date(candidate);
    return Number.isNaN(parsed.getTime()) ? fallback : candidate;
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || state.currentUser.role !== 'credit_manager') {
      return;
    }

    const loadStatuses = async () => {
      const managerEmail = state.currentUser.email?.toLowerCase();
      if (!managerEmail) {
        return;
      }

      for (const base of API_BASE_CANDIDATES) {
        try {
          const response = await fetch(`${base}/applications/manager/${encodeURIComponent(managerEmail)}/dashboard`);
          if (response.ok) {
            const data = await response.json();
            const apps = Array.isArray(data?.applications) ? data.applications : [];
            if (apps.length) {
              const latest = [...apps].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
              setDerivedAgentStatuses(buildDerivedStatuses(latest));
              return;
            }
          }
        } catch {
          // Try next backend candidate.
        }
      }

      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(APPLICATION_ASSIGNMENTS_KEY);
          const records = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
          const scoped = records.filter((item) => String(item.managerEmail || '').toLowerCase() === managerEmail);
          if (scoped.length) {
            const latest = [...scoped].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
            setDerivedAgentStatuses(buildDerivedStatuses(latest));
            return;
          }
        } catch {
          // Ignore local fallback parse issues.
        }
      }

      setDerivedAgentStatuses(null);
    };

    void loadStatuses();
    const interval = window.setInterval(() => {
      void loadStatuses();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isClient, state.currentUser.email, state.currentUser.role]);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const loadSystemMetrics = async () => {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const response = await fetch(`${base}/applications/system-metrics`);
          if (!response.ok) {
            continue;
          }
          const payload = await response.json();
          const load = Number(payload?.system_load_percent);
          const label = String(payload?.health_label || 'Healthy');
          if (!Number.isNaN(load)) {
            setSystemMetrics({
              system_load_percent: Math.max(0, Math.min(100, load)),
              health_label: label,
            });
            return;
          }
        } catch {
          // Try next backend candidate.
        }
      }
    };

    void loadSystemMetrics();
    const interval = window.setInterval(() => {
      void loadSystemMetrics();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isClient]);

  const loadPercent = systemMetrics?.system_load_percent ?? 34;
  const loadLabel = systemMetrics?.health_label ?? 'Healthy';

  const effectiveStatuses = derivedAgentStatuses || state.agentStatuses;

  const liveAgentStatuses = {
    compliance: {
      ...mockAgentStatuses.compliance,
      status: getNormalizedStatus(effectiveStatuses.kyc.status),
      lastRun: getSafeLastRun(effectiveStatuses.kyc.lastRun, mockAgentStatuses.compliance.lastRun),
      findings: effectiveStatuses.kyc.findings || mockAgentStatuses.compliance.findings,
      completionPercent: effectiveStatuses.kyc.completionPercent ?? (effectiveStatuses.kyc.status === 'complete' ? 100 : effectiveStatuses.kyc.status === 'running' ? 40 : 0),
    },
    financial: {
      ...mockAgentStatuses.financial,
      status: getNormalizedStatus(effectiveStatuses.financial.status),
      lastRun: getSafeLastRun(effectiveStatuses.financial.lastRun, mockAgentStatuses.financial.lastRun),
      findings: effectiveStatuses.financial.findings || mockAgentStatuses.financial.findings,
      completionPercent: effectiveStatuses.financial.completionPercent ?? (effectiveStatuses.financial.status === 'complete' ? 100 : effectiveStatuses.financial.status === 'running' ? 65 : 0),
    },
    fraud: {
      ...mockAgentStatuses.fraud,
      status: getNormalizedStatus(effectiveStatuses.fraud.status),
      lastRun: getSafeLastRun(effectiveStatuses.fraud.lastRun, mockAgentStatuses.fraud.lastRun),
      findings: effectiveStatuses.fraud.findings || mockAgentStatuses.fraud.findings,
      anomalyDetected: effectiveStatuses.fraud.anomalyDetected,
      completionPercent: effectiveStatuses.fraud.completionPercent ?? (effectiveStatuses.fraud.status === 'complete' ? 100 : 0),
    },
    decision: {
      ...mockAgentStatuses.decision,
      status: getNormalizedStatus(effectiveStatuses.decision.status),
      lastRun: getSafeLastRun(effectiveStatuses.decision.lastRun, mockAgentStatuses.decision.lastRun),
      findings: effectiveStatuses.decision.findings || mockAgentStatuses.decision.findings,
      completionPercent: effectiveStatuses.decision.completionPercent ?? (effectiveStatuses.decision.status === 'complete' ? 100 : effectiveStatuses.decision.status === 'running' ? 70 : 0),
    },
  };

  const completedCount = Object.values(liveAgentStatuses).filter(
    (a) => a.status === 'complete'
  ).length;
  const runningCount = Object.values(liveAgentStatuses).filter(
    (a) => a.status === 'running'
  ).length;

  return (
    <div className="min-h-screen p-8 animate-in fade-in duration-400" style={{ backgroundColor: '#0B0F1A' }}>
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2" style={{ color: '#F1F5F9' }}>
          AI Agent Control Center
        </h1>
        <p style={{ color: '#64748B' }} className="text-lg">
          Real-time orchestration status
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {agentConfigs.map((config) => (
          <AgentCard
            key={config.key}
            config={config}
            status={liveAgentStatuses[config.key as keyof typeof liveAgentStatuses]}
            isClient={isClient}
          />
        ))}
      </div>

      {/* Summary Section */}
      <div
        className="rounded-lg p-8 animate-in fade-in duration-500 delay-300"
        style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
      >
        <h2 className="text-xl font-bold mb-6" style={{ color: '#F1F5F9' }}>
          Orchestration Summary
        </h2>

        <div className="grid grid-cols-4 gap-6">
          {/* Completed */}
          <div
            className="rounded-lg p-4 text-center"
            style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}
          >
            <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
              Completed
            </p>
            <p className="text-3xl font-bold" style={{ color: '#2DD4A0' }}>
              {completedCount}
            </p>
            <p style={{ color: '#64748B' }} className="text-xs mt-2">
              of 4 agents
            </p>
          </div>

          {/* In Progress */}
          <div
            className="rounded-lg p-4 text-center"
            style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}
          >
            <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
              In Progress
            </p>
            <p className="text-3xl font-bold" style={{ color: '#D4A843' }}>
              {runningCount}
            </p>
            <p style={{ color: '#64748B' }} className="text-xs mt-2">
              Processing now
            </p>
          </div>

          {/* System Load */}
          <div
            className="rounded-lg p-4 text-center"
            style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}
          >
            <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
              System Load
            </p>
            <p className="text-3xl font-bold" style={{ color: '#F1F5F9' }}>
              {loadPercent}%
            </p>
            <p style={{ color: '#64748B' }} className="text-xs mt-2">
              {loadLabel}
            </p>
          </div>

          {/* Last Update */}
          <div
            className="rounded-lg p-4 text-center"
            style={{ backgroundColor: '#0B0F1A', border: '1px solid #1E2A3A' }}
          >
            <p style={{ color: '#64748B' }} className="text-xs uppercase mb-2">
              Last Update
            </p>
            <p style={{ color: '#F1F5F9' }} className="text-sm font-mono mt-3">
              {isClient ? new Date().toLocaleTimeString() : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
