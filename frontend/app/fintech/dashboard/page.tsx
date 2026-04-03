'use client';

import { useAppContext } from '@/lib/AppContext';
import {
  FileText, Clock, CheckCircle2, AlertCircle, Download, Upload, Send,
  MessageSquare, Paperclip, Eye, X, Plus
} from 'lucide-react';
import { useState, useEffect } from 'react';

const STAGES = [
  { id: 'submitted', label: 'Application Received', icon: FileText },
  { id: 'kyc', label: 'KYC Verification', icon: CheckCircle2 },
  { id: 'financial_analysis', label: 'Financial Analysis', icon: AlertCircle },
  { id: 'site_visit', label: 'Site Visit Scheduled', icon: Clock },
  { id: 'cam_generation', label: 'CAM Generation', icon: Upload },
  { id: 'committee_review', label: 'Committee Review', icon: MessageSquare },
  { id: 'decision', label: 'Decision', icon: CheckCircle2 },
];

// Mock data for dashboard features
const mockDocuments = [
  { id: 1, name: 'GST Certificate', type: 'Certificate', uploadedOn: '2024-03-15', status: 'Verified' },
  { id: 2, name: 'Bank Statements.pdf', type: 'Financial', uploadedOn: '2024-03-16', status: 'Verified' },
  { id: 3, name: 'ITR 2023', type: 'Tax Document', uploadedOn: '2024-03-17', status: 'Pending' },
  { id: 4, name: 'Updated Financials', type: 'Financial', uploadedOn: '2024-03-18', status: 'Requested' },
];

const mockNotifications = [
  { id: 1, sender: 'Amit Sharma', role: 'Credit Manager', message: 'Your KYC verification is complete.', timestamp: '2024-03-18 14:30' },
  { id: 2, sender: 'Priya Patel', role: 'Credit Manager', message: 'Please provide updated financial statements for FY 2024.', timestamp: '2024-03-17 10:15' },
  { id: 3, sender: 'Amit Sharma', role: 'Credit Manager', message: 'Site visit scheduled for March 25th at 2 PM.', timestamp: '2024-03-16 09:45' },
];

const mockNegotiations = [
  { id: 1, sender: 'You', message: 'Can we discuss the interest rate?', timestamp: '2024-03-15 16:20', type: 'query' },
  { id: 2, sender: 'Amit Sharma', message: 'Current rate is 12% based on risk assessment. Open to discussion.', timestamp: '2024-03-15 17:05', type: 'response' },
];

const mockSubmissions = [
  { id: 1, date: '2024-03-18', document: 'Quarterly Utilization Report', amount: '₹150,000', status: 'Submitted' },
  { id: 2, date: '2024-03-10', document: 'Compliance Certificate', amount: 'N/A', status: 'Approved' },
];

export default function DashboardPage() {
  const { state, dispatch } = useAppContext();
  const { applicationState, documents, notifications, formData } = state;
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'disbursement'>('lifecycle');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [querySubject, setQuerySubject] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [utilizationReport, setUtilizationReport] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const backendScoring = formData.backendScoring || {};
  const gstinResult = backendScoring.gstinResult;
  const scoreResult = backendScoring.scoreResult;

  const dashboardDocuments = documents.length
    ? documents.map((doc, index) => ({
        id: index + 1,
        name: doc.name,
        type: doc.type,
        uploadedOn: mounted ? new Date(doc.uploadedAt).toLocaleDateString() : doc.uploadedAt,
        status: doc.status === 'approved' ? 'Verified' : doc.status === 'pending' ? 'Pending' : 'Rejected',
      }))
    : [];

  const dashboardNotifications = notifications.length
    ? notifications.map((notif, index) => ({
        id: index + 1,
        sender: notif.from,
        role: notif.from.includes('Agent') ? 'AI Agent' : 'Credit Manager',
        message: notif.message,
        timestamp: mounted ? new Date(notif.timestamp).toLocaleString() : notif.timestamp,
      }))
    : [];

  const negotiationThread = gstinResult
    ? [
        {
          id: 1,
          sender: 'System',
          message: `GSTIN ${gstinResult.gstin} scored ${gstinResult.credit_score} (${gstinResult.risk_band}).`,
          timestamp: mounted ? new Date(gstinResult.score_freshness_timestamp).toLocaleString() : gstinResult.score_freshness_timestamp,
          type: 'response',
        },
      ]
    : [];

  const submissionHistory = scoreResult
    ? [
        {
          id: 1,
          date: mounted && applicationState.lastUpdated ? new Date(applicationState.lastUpdated).toLocaleDateString() : applicationState.lastUpdated,
          document: 'Backend Credit Score',
          amount: scoreResult.final_score.toFixed(2),
          status: scoreResult.decision,
        },
      ]
    : [];

  const currentStageIndex = STAGES.findIndex((s) => s.id === applicationState.currentStage);

  const handleAdvanceStage = () => {
    const nextStageIndex = currentStageIndex + 1;
    if (nextStageIndex < STAGES.length) {
      const nextStage = STAGES[nextStageIndex].id as typeof applicationState.currentStage;
      dispatch({
        type: 'UPDATE_APPLICATION_STATE',
        payload: { currentStage: nextStage, lastUpdated: new Date().toISOString() }
      });
    }
  };

  return (
    <div className="px-6 py-8 min-h-screen animate-in fade-in duration-400" style={{ backgroundColor: '#0B0F1A' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4" style={{ color: '#F1F5F9' }}>
          Loan Application Dashboard
        </h1>
        <div className="space-y-2">
          <p style={{ color: '#64748B' }}>
            Application ID: <span className="font-mono" style={{ color: '#D4A843' }}>
              {applicationState.applicationId || 'Not submitted yet'}
            </span>
          </p>
          {mounted && applicationState.submittedAt && (
            <p style={{ color: '#64748B' }}>
              Submitted: <span style={{ color: '#F1F5F9' }}>
                {new Date(applicationState.submittedAt).toLocaleString()}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="mb-8 flex gap-2">
        <button
          onClick={() => setActiveTab('lifecycle')}
          className="px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: activeTab === 'lifecycle' ? '#D4A843' : '#1E2A3A',
            color: activeTab === 'lifecycle' ? '#0B0F1A' : '#F1F5F9',
          }}
        >
          Application Lifecycle
        </button>
        <button
          onClick={() => setActiveTab('disbursement')}
          className="px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: activeTab === 'disbursement' ? '#D4A843' : '#1E2A3A',
            color: activeTab === 'disbursement' ? '#0B0F1A' : '#F1F5F9',
          }}
        >
          Post-Disbursement
        </button>
      </div>

      {activeTab === 'lifecycle' && (
        <div className="space-y-8">
          {/* Horizontal State Machine Stepper */}
          <div className="rounded-lg p-6 animate-in fade-in duration-300" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
            <h2 className="text-lg font-semibold mb-6" style={{ color: '#F1F5F9' }}>
              Application Progress
            </h2>
            <div className="flex items-center justify-between relative px-4">
              {STAGES.map((stage, idx) => {
                const isComplete = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const Icon = stage.icon;

                return (
                  <div key={stage.id} className="flex flex-col items-center" style={{ flex: 1 }}>
                    {/* Icon Circle */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center relative mb-3 transition-all duration-300"
                      style={{
                        backgroundColor: isComplete || isCurrent ? '#D4A843' : '#1E2A3A',
                        boxShadow: isCurrent ? '0 0 20px rgba(212, 168, 67, 0.6)' : 'none',
                        animation: isCurrent ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                      }}
                    >
                      <Icon
                        size={20}
                        style={{
                          color: isComplete || isCurrent ? '#0B0F1A' : '#64748B',
                        }}
                      />
                    </div>
                    {/* Label */}
                    <p
                      className="text-xs font-medium text-center"
                      style={{
                        color: isComplete || isCurrent ? '#F1F5F9' : '#64748B',
                      }}
                    >
                      {stage.label}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Connector Line */}
            <div className="flex justify-between mt-4 px-4">
              {STAGES.map((_, idx) => {
                if (idx === STAGES.length - 1) return null;
                const isComplete = idx < currentStageIndex;
                return (
                  <div
                    key={`line-${idx}`}
                    className="flex-1 h-1 mx-2 rounded transition-all duration-300"
                    style={{
                      backgroundColor: isComplete ? '#D4A843' : '#1E2A3A',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Demo: Simulate Stage Advance Button - Repositioned */}
          <div className="flex justify-between items-center gap-4">
            <div></div>
            <div className="flex gap-3">
              <button
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: '#1E2A3A',
                  color: '#D4A843',
                  border: '1px solid #D4A843',
                }}
              >
                Score Documents
              </button>
              <button
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: '#D4A843',
                  color: '#0B0F1A',
                }}
              >
                Get Explainable Score
              </button>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAdvanceStage}
              disabled={currentStageIndex >= STAGES.length - 1}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: '#D4A843',
                color: '#0B0F1A',
                border: '1px solid #D4A843',
              }}
            >
              Next →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Document Manager */}
            <div className="rounded-lg p-6 animate-in fade-in duration-300 delay-100" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: '#F1F5F9' }}>
                  Document Manager
                </h2>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="p-2 rounded-lg transition-all hover:opacity-80"
                  style={{ backgroundColor: '#1E2A3A', color: '#D4A843' }}
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottomColor: '#1E2A3A' }} className="border-b">
                      <th className="text-left py-2 px-2" style={{ color: '#64748B' }}>Name</th>
                      <th className="text-left py-2 px-2" style={{ color: '#64748B' }}>Type</th>
                      <th className="text-left py-2 px-2" style={{ color: '#64748B' }}>Date</th>
                      <th className="text-left py-2 px-2" style={{ color: '#64748B' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardDocuments.map((doc) => (
                      <tr key={doc.id} style={{ borderBottomColor: '#1E2A3A' }} className="border-b hover:opacity-80 transition-opacity">
                        <td className="py-2 px-2 flex items-center gap-2">
                          <FileText size={16} style={{ color: '#D4A843' }} />
                          <span style={{ color: '#F1F5F9' }}>{doc.name}</span>
                        </td>
                        <td className="py-2 px-2" style={{ color: '#F1F5F9' }}>{doc.type}</td>
                        <td className="py-2 px-2" style={{ color: '#64748B' }}>{doc.uploadedOn}</td>
                        <td className="py-2 px-2">
                          <span
                            className="px-2 py-1 rounded text-xs font-semibold"
                            style={{
                              backgroundColor:
                                doc.status === 'Verified'
                                  ? 'rgba(45, 212, 160, 0.2)'
                                  : doc.status === 'Pending'
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : 'rgba(239, 68, 68, 0.2)',
                              color:
                                doc.status === 'Verified'
                                  ? '#2DD4A0'
                                  : doc.status === 'Pending'
                                    ? '#F59E0B'
                                    : '#EF4444',
                            }}
                          >
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Notifications Panel */}
            <div className="rounded-lg p-6 animate-in fade-in duration-300 delay-200" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#F1F5F9' }}>
                Messages from Credit Manager
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {dashboardNotifications.map((notif) => (
                  <div key={notif.id} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(212, 168, 67, 0.05)', border: '1px solid #1E2A3A' }}>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p style={{ color: '#D4A843' }} className="text-sm font-semibold">
                          {notif.sender}
                        </p>
                        <p style={{ color: '#64748B' }} className="text-xs">
                          {notif.role} • {notif.timestamp}
                        </p>
                      </div>
                    </div>
                    <p style={{ color: '#F1F5F9' }} className="text-sm mb-2">
                      {notif.message}
                    </p>
                    <button
                      className="text-xs px-3 py-1 rounded transition-all hover:opacity-80"
                      style={{
                        backgroundColor: '#1E2A3A',
                        color: '#D4A843',
                      }}
                    >
                      Reply
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Negotiation & Query Section */}
            <div className="md:col-span-2 rounded-lg p-6 animate-in fade-in duration-300 delay-300" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#F1F5F9' }}>
                Negotiation & Query
              </h2>

              {/* Query Form */}
              <div className="mb-6 pb-6 border-b" style={{ borderBottomColor: '#1E2A3A' }}>
                <div className="space-y-3 mb-4">
                  <div>
                    <label style={{ color: '#64748B' }} className="block text-sm mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={querySubject}
                      onChange={(e) => setQuerySubject(e.target.value)}
                      placeholder="e.g., Interest Rate Discussion"
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: '#0B0F1A',
                        borderColor: '#1E2A3A',
                        color: '#F1F5F9',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#64748B' }} className="block text-sm mb-1">
                      Message
                    </label>
                    <textarea
                      value={queryMessage}
                      onChange={(e) => setQueryMessage(e.target.value)}
                      placeholder="Type your query or counter-proposal..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: '#0B0F1A',
                        borderColor: '#1E2A3A',
                        color: '#F1F5F9',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-2 rounded-lg transition-all hover:opacity-80 flex items-center gap-2"
                      style={{
                        backgroundColor: '#1E2A3A',
                        color: '#D4A843',
                      }}
                    >
                      <Paperclip size={16} />
                      Attach Document
                    </button>
                  </div>
                  <button
                    className="w-full px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: '#D4A843',
                      color: '#0B0F1A',
                    }}
                  >
                    <Send size={16} />
                    Send Query
                  </button>
                </div>
              </div>

              {/* Negotiation Thread */}
              <div>
                <h3 style={{ color: '#F1F5F9' }} className="font-semibold mb-3">
                  Previous Negotiations
                </h3>
                <div className="space-y-3">
                  {negotiationThread.map((neg) => (
                    <div key={neg.id} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(212, 168, 67, 0.05)' }}>
                      <div className="flex items-start justify-between mb-1">
                        <p style={{ color: '#D4A843' }} className="text-sm font-semibold">
                          {neg.sender}
                        </p>
                        <p style={{ color: '#64748B' }} className="text-xs">
                          {neg.timestamp}
                        </p>
                      </div>
                      <p style={{ color: '#F1F5F9' }} className="text-sm">
                        {neg.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'disbursement' && (
        <div className="space-y-6">
          {/* Post-Disbursement Form */}
          <div className="rounded-lg p-6 animate-in fade-in duration-300" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#F1F5F9' }}>
              Submit Loan Utilization Report
            </h2>
            <div className="space-y-4">
              <div>
                <label style={{ color: '#64748B' }} className="block text-sm mb-1">
                  Utilization Report
                </label>
                <textarea
                  value={utilizationReport}
                  onChange={(e) => setUtilizationReport(e.target.value)}
                  placeholder="Describe how the loan funds have been utilized..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: '#0B0F1A',
                    borderColor: '#1E2A3A',
                    color: '#F1F5F9',
                  }}
                />
              </div>
              <div>
                <label style={{ color: '#64748B' }} className="block text-sm mb-2">
                  Upload Compliance Certificates
                </label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:opacity-80"
                  style={{ borderColor: '#D4A843', backgroundColor: 'rgba(212, 168, 67, 0.05)' }}
                >
                  <Upload size={24} style={{ color: '#D4A843', margin: '0 auto mb-2' }} />
                  <p style={{ color: '#F1F5F9' }}>Drag files here or click to upload</p>
                </div>
              </div>
              <button
                className="w-full px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: '#D4A843',
                  color: '#0B0F1A',
                }}
              >
                Submit Report & Documents
              </button>
            </div>
          </div>

          {/* Submission History */}
          <div className="rounded-lg p-6 animate-in fade-in duration-300 delay-100" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#F1F5F9' }}>
              Submission History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottomColor: '#1E2A3A' }} className="border-b">
                    <th className="text-left py-2 px-2" style={{ color: '#64748B' }}>Date</th>
                    <th className="text-left py-2 px-2" style={{ color: '#64748B' }}>Document</th>
                    <th className="text-left py-2 px-2" style={{ color: '#64748B' }}>Amount</th>
                    <th className="text-left py-2 px-2" style={{ color: '#64748B' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionHistory.map((sub) => (
                    <tr key={sub.id} style={{ borderBottomColor: '#1E2A3A' }} className="border-b hover:opacity-80 transition-opacity">
                      <td className="py-2 px-2" style={{ color: '#F1F5F9' }}>{sub.date}</td>
                      <td className="py-2 px-2" style={{ color: '#F1F5F9' }}>{sub.document}</td>
                      <td className="py-2 px-2 font-mono" style={{ color: '#D4A843' }}>{sub.amount}</td>
                      <td className="py-2 px-2">
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{
                            backgroundColor: sub.status === 'Approved' ? 'rgba(45, 212, 160, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: sub.status === 'Approved' ? '#2DD4A0' : '#F59E0B',
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="rounded-lg p-6 max-w-md w-full mx-4" style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: '#F1F5F9' }} className="text-lg font-semibold">
                Upload Supplemental Document
              </h3>
              <button onClick={() => setShowUploadModal(false)} style={{ color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-4 transition-colors hover:opacity-80"
              style={{ borderColor: '#D4A843', backgroundColor: 'rgba(212, 168, 67, 0.05)' }}
            >
              <Upload size={32} style={{ color: '#D4A843', margin: '0 auto mb-2' }} />
              <p style={{ color: '#F1F5F9' }} className="mb-1">
                Drag file here or click to upload
              </p>
              <p style={{ color: '#64748B' }} className="text-sm">
                PDF, DOC, or Image up to 5MB
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ backgroundColor: '#1E2A3A', color: '#F1F5F9' }}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: '#D4A843', color: '#0B0F1A' }}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
