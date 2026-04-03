'use client';

import { useAppContext } from '@/lib/AppContext';
import { useState, useEffect } from 'react';
import {
  Shield, BarChart3, AlertTriangle, Brain, CheckCircle2
} from 'lucide-react';

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
            {isClient ? new Date(status.lastRun).toLocaleTimeString() : 'Loading...'}
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const liveAgentStatuses = {
    compliance: {
      ...mockAgentStatuses.compliance,
      status: state.agentStatuses.kyc.status,
      lastRun: state.agentStatuses.kyc.lastRun,
      findings: state.agentStatuses.kyc.findings,
      completionPercent: state.agentStatuses.kyc.completionPercent ?? (state.agentStatuses.kyc.status === 'complete' ? 100 : 40),
    },
    financial: {
      ...mockAgentStatuses.financial,
      status: state.agentStatuses.financial.status,
      lastRun: state.agentStatuses.financial.lastRun,
      findings: state.agentStatuses.financial.findings,
      completionPercent: state.agentStatuses.financial.completionPercent ?? (state.agentStatuses.financial.status === 'complete' ? 100 : state.agentStatuses.financial.status === 'running' ? 65 : 0),
    },
    fraud: {
      ...mockAgentStatuses.fraud,
      status: state.agentStatuses.fraud.status,
      lastRun: state.agentStatuses.fraud.lastRun,
      findings: state.agentStatuses.fraud.findings,
      anomalyDetected: state.agentStatuses.fraud.anomalyDetected,
      completionPercent: state.agentStatuses.fraud.completionPercent ?? (state.agentStatuses.fraud.status === 'complete' ? 100 : 0),
    },
    decision: {
      ...mockAgentStatuses.decision,
      status: state.agentStatuses.decision.status,
      lastRun: state.agentStatuses.decision.lastRun,
      findings: state.agentStatuses.decision.findings,
      completionPercent: state.agentStatuses.decision.completionPercent ?? (state.agentStatuses.decision.status === 'complete' ? 100 : state.agentStatuses.decision.status === 'running' ? 70 : 0),
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
              34%
            </p>
            <p style={{ color: '#64748B' }} className="text-xs mt-2">
              Healthy
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
