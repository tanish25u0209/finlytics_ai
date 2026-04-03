'use client';

import { useAppContext } from '@/lib/AppContext';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, ChevronLeft, Upload, CheckCircle2, Clock, AlertCircle,
  Shield, Lock, FileText, Eye, EyeOff, Loader
} from 'lucide-react';
import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

type BadgeProps = {
  label: string;
  type?: 'info' | 'success' | 'warning';
};

type ExtractedPayload = {
  monthly_revenue: number | null;
  total_debt: number | null;
  emi: number | null;
  business_age_months: number | null;
  gst_compliant: boolean | null;
  has_disputes: boolean | null;
};

type ProcessedDocument = {
  document_type: string;
  source_document: string;
  monthly_revenue?: number | null;
  total_debt?: number | null;
  emi?: number | null;
  business_age_months?: number | null;
  gst_compliant?: boolean | null;
  has_disputes?: boolean | null;
};

type ScoreResult = {
  rule_score: number;
  pd: number;
  final_score: number;
  risk_category: string;
  decision: string;
};

type GstinResult = {
  gstin: string;
  credit_score: number;
  risk_band: string;
  risk_score: number;
  probability_of_default: number;
  risk_category: string;
  top_reasons: string[];
  recommended_loan_amount: number;
  recommended_tenure_months: number;
  fraud_flag: boolean;
  fraud_score: number;
  fraud_summary: string;
  linked_gstins: string[];
  score_freshness_timestamp: string;
};

type FileUploadZoneProps = {
  label: string;
  count?: number;
  documentType?: string;
  onDocumentProcessed?: (payload: Partial<ExtractedPayload>, document: ProcessedDocument | null) => void;
};

const INITIAL_SCORING_PAYLOAD: ExtractedPayload = {
  monthly_revenue: null,
  total_debt: null,
  emi: null,
  business_age_months: null,
  gst_compliant: null,
  has_disputes: null,
};

const STEPS = [
  { id: 'bank', title: 'Bank Selection', icon: 'bank' },
  { id: 'company_id', title: 'Company Identification', icon: 'building' },
  { id: 'company_reg', title: 'Company Registration', icon: 'file' },
  { id: 'gst', title: 'GST Filings', icon: 'document' },
  { id: 'itr', title: 'Income Tax Returns', icon: 'tax' },
  { id: 'banking', title: 'Banking Data', icon: 'wallet' },
  { id: 'executive', title: 'Executive Identity', icon: 'person' },
  { id: 'loan_request', title: 'Loan Request Details', icon: 'money' },
  { id: 'loan_history', title: 'Loan History (Optional)', icon: 'history' },
];

const Badge = ({ label, type = 'info' }: BadgeProps) => {
  const colors: Record<NonNullable<BadgeProps['type']>, { bg: string; text: string }> = {
    info: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
    success: { bg: 'rgba(45, 212, 160, 0.1)', text: '#2DD4A0' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
  };
  const color = colors[type] || colors.info;
  
  return (
    <span
      className="inline-block px-2 py-1 rounded text-xs font-semibold"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {label}
    </span>
  );
};

const FileUploadZone = ({ label, count = 1, documentType, onDocumentProcessed }: FileUploadZoneProps) => {
  const [uploaded, setUploaded] = useState(Array(count).fill(null));
  const [uploading, setUploading] = useState(Array(count).fill(false));
  const [error, setError] = useState('');

  const handleUpload = async (index: number, file: File | null) => {
    if (!file) {
      return;
    }

    setError('');
    setUploading((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    try {
      if (documentType && onDocumentProcessed) {
        const formData = new FormData();
        formData.append('files', file, file.name);
        const response = await fetch(`${API_BASE_URL}/extract-documents`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          throw new Error('Extraction failed');
        }
        const data = await response.json();
        onDocumentProcessed(
          data.scoring_payload as Partial<ExtractedPayload>,
          (data.documents?.[0] as ProcessedDocument) || null,
        );
      }

      setUploaded((prev) => {
        const next = [...prev];
        next[index] = file.name;
        return next;
      });
    } catch {
      setError('Upload processed, but extraction was unavailable.');
    } finally {
      setUploading((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  };

  return (
    <div className="space-y-3">
      {Array(count)
        .fill(null)
        .map((_, index) => (
          <div
            key={index}
            className="relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:opacity-80 overflow-hidden"
            style={{
              borderColor: uploaded[index] ? '#D4A843' : '#1E2A3A',
              backgroundColor: uploaded[index] ? 'rgba(212, 168, 67, 0.05)' : 'transparent',
            }}
          >
            <input
              type="file"
              accept=".pdf"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(event) => handleUpload(index, event.target.files?.[0] || null)}
            />
            {uploading[index] ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-5 h-5 border-2 border-transparent border-t-2 rounded-full"
                  style={{ borderTopColor: '#D4A843', animation: 'spin 1s linear infinite' }}
                />
                <span style={{ color: '#D4A843' }} className="text-xs font-medium">
                  Processing with OCR...
                </span>
              </div>
            ) : uploaded[index] ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} style={{ color: '#D4A843' }} />
                  <div className="text-left">
                    <p style={{ color: '#F1F5F9' }} className="text-sm font-medium">
                      {uploaded[index]}
                    </p>
                    <p style={{ color: '#2DD4A0' }} className="text-xs font-semibold">
                      ✓ Verified
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} style={{ color: '#D4A843' }} />
                <span style={{ color: '#F1F5F9' }} className="text-sm font-medium">
                  Click to upload
                </span>
                <span style={{ color: '#64748B' }} className="text-xs">
                  or drag and drop
                </span>
              </div>
            )}
          </div>
        ))}
      {error ? (
        <p className="text-xs font-medium" style={{ color: '#F59E0B' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default function ApplyPage() {
  const router = useRouter();
  const { state, updateApplicationState, updateFormData, addDocument, updateAgentStatus, addNotification } = useAppContext();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [extractedPayload, setExtractedPayload] = useState<ExtractedPayload>(INITIAL_SCORING_PAYLOAD);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [gstinInput, setGstinInput] = useState('');
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinError, setGstinError] = useState('');
  const [gstinResult, setGstinResult] = useState<GstinResult | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = state.formData.backendScoring;
    if (saved?.extractedPayload) {
      setExtractedPayload(saved.extractedPayload as ExtractedPayload);
    }
    if (saved?.processedDocuments) {
      setProcessedDocuments(saved.processedDocuments as ProcessedDocument[]);
    }
    if (saved?.scoreResult) {
      setScoreResult(saved.scoreResult as ScoreResult);
    }
    if (saved?.gstinInput) {
      setGstinInput(String(saved.gstinInput));
    }
    if (saved?.gstinResult) {
      setGstinResult(saved.gstinResult as GstinResult);
    }
  }, [state.formData.backendScoring]);

  const currentStep = STEPS[currentStepIndex];
  const requiredPayloadReady = Object.values(extractedPayload).every((value) => value !== null);

  const persistBackendScoring = (patch: Record<string, unknown>) => {
    updateFormData('backendScoring', {
      ...(state.formData.backendScoring || {}),
      ...patch,
    });
  };

  const mapRiskLevel = (value: string | null | undefined): 'low' | 'medium' | 'high' => {
    const normalized = (value || '').toLowerCase();
    if (normalized.includes('prime') || normalized.includes('low')) return 'low';
    if (normalized.includes('medium')) return 'medium';
    return 'high';
  };

  const handleDocumentProcessed = (payload: Partial<ExtractedPayload>, document: ProcessedDocument | null) => {
    const nextPayload = {
      ...extractedPayload,
      ...Object.fromEntries(Object.entries(payload || {}).filter(([, value]) => value !== null && value !== undefined)),
    };
    setExtractedPayload(nextPayload);

    const nextProcessedDocuments = document?.source_document
      ? [
          ...processedDocuments.filter((item) => item.source_document !== document.source_document),
          document,
        ]
      : processedDocuments;

    if (document?.source_document) {
      setProcessedDocuments(nextProcessedDocuments);

      addDocument({
        id: `doc-${document.source_document}`,
        name: document.source_document,
        type: document.document_type,
        uploadedAt: new Date().toISOString(),
        status: 'approved',
      });
    }

    persistBackendScoring({
      extractedPayload: nextPayload,
      processedDocuments: nextProcessedDocuments,
    });
  };

  const handleCalculateScore = async () => {
    if (!requiredPayloadReady) {
      setScoreError('Upload the scoring PDFs first so we can extract all required fields.');
      return;
    }

    setScoreLoading(true);
    setScoreError('');

    try {
      const response = await fetch(`${API_BASE_URL}/calculate-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extractedPayload),
      });

      if (!response.ok) {
        throw new Error('Score calculation failed');
      }

      const data = await response.json();
      setScoreResult(data);
      persistBackendScoring({
        extractedPayload,
        scoreResult: data,
      });
      updateAgentStatus('financial', {
        status: 'complete',
        findings: `Backend score calculated: ${data.final_score} (${data.risk_category}) with decision ${data.decision}.`,
        completionPercent: 100,
      });
      updateAgentStatus('decision', {
        status: 'running',
        findings: `Decision model prepared ${data.decision} recommendation from document-derived financial signals.`,
        completionPercent: 70,
      });
      updateApplicationState({
        riskLevel: mapRiskLevel(data.risk_category),
        currentStage: 'financial_analysis',
      });
      addNotification({
        id: `notif-score-${Date.now()}`,
        from: 'Financial Agent',
        message: `Document-derived backend score calculated: ${data.final_score} (${data.risk_category}).`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    } catch {
      setScoreError('Backend scoring is unavailable right now.');
      setScoreResult(null);
    } finally {
      setScoreLoading(false);
    }
  };

  const handleGstinScore = async () => {
    if (!gstinInput.trim()) {
      setGstinError('Enter a GSTIN to fetch the explainable score.');
      return;
    }

    setGstinLoading(true);
    setGstinError('');

    try {
      const response = await fetch(`${API_BASE_URL}/gstin-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gstin: gstinInput.trim() }),
      });

      if (!response.ok) {
        throw new Error('GSTIN score lookup failed');
      }

      const data = await response.json();
      setGstinResult(data);
      persistBackendScoring({
        gstinInput: gstinInput.trim(),
        gstinResult: data,
      });
      updateApplicationState({
        riskLevel: mapRiskLevel(data.risk_band),
        companyName: state.applicationState.companyName || `GSTIN ${data.gstin}`,
      });
      updateAgentStatus('fraud', {
        status: 'complete',
        findings: data.fraud_summary,
        anomalyDetected: data.fraud_flag,
        completionPercent: 100,
      });
      updateAgentStatus('decision', {
        status: 'complete',
        findings: `GSTIN score ${data.credit_score} (${data.risk_band}); recommended ₹${Number(data.recommended_loan_amount).toLocaleString('en-IN')} for ${data.recommended_tenure_months} months.`,
        completionPercent: 100,
      });
      addNotification({
        id: `notif-gstin-${Date.now()}`,
        from: 'Decision Agent',
        message: `GSTIN ${data.gstin} scored ${data.credit_score} (${data.risk_band}).`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    } catch {
      setGstinError('Could not fetch the explainable GSTIN score.');
      setGstinResult(null);
    } finally {
      setGstinLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleInitiateSubmission = () => {
    handleFinalSubmit();
  };

  const handleFinalSubmit = () => {
    const applicationId = `FAIM-2024-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    updateApplicationState({
      applicationId,
      currentStage: 'kyc',
      submittedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      companyName: 'TechVentures Inc.',
      loanAmount: 500000,
      riskLevel: 'medium',
    });

    addNotification({
      id: `notif-${Date.now()}`,
      from: 'System',
      message: 'Application submitted successfully. KYC verification started.',
      timestamp: new Date().toISOString(),
      read: false,
    });

    router.push('/fintech/dashboard');
  };

  return (
    <div
      className="min-h-screen p-6 animate-in fade-in duration-400"
      style={{ backgroundColor: '#0B0F1A' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#F1F5F9' }}>
            Loan Application
          </h1>
          <p style={{ color: '#64748B' }}>
            Step {currentStepIndex + 1} of {STEPS.length}: {currentStep.title}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 grid grid-cols-9 gap-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center">
              <button
                onClick={() => idx <= currentStepIndex && setCurrentStepIndex(idx)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1"
                style={{
                  backgroundColor: idx < currentStepIndex ? '#2DD4A0' : idx === currentStepIndex ? '#D4A843' : '#1E2A3A',
                  color: idx < currentStepIndex || idx === currentStepIndex ? '#0B0F1A' : '#64748B',
                }}
              >
                {idx < currentStepIndex ? '✓' : idx + 1}
              </button>
              <p
                className="text-xs text-center"
                style={{ color: idx <= currentStepIndex ? '#F1F5F9' : '#64748B' }}
              >
                {step.title.split(' ')[0]}
              </p>
            </div>
          ))}
        </div>

        {/* Main Form Container */}
        <div
          className="rounded-lg p-8 animate-in fade-in duration-300"
          style={{ backgroundColor: '#141929', border: '1px solid #1E2A3A' }}
        >
          {/* Form Content Based on Current Step */}
          {currentStepIndex === 0 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                Bank Selection
              </h3>
              <div className="space-y-4">
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Bank Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter bank name"
                    className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2"
                    style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }}
                  />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Branch <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="text" placeholder="Enter branch name" className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }} />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Address <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }} rows={3} />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    IFSC Code <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="text" placeholder="SBIN0001234" className="w-full px-4 py-2 rounded-lg bg-black/30 border font-mono focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#D4A843' }} />
                </div>
              </div>
            </div>
          )}

          {currentStepIndex === 1 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                Company Identification
              </h3>
              <Badge label="Auto-verified via GST & MCA APIs" type="success" />
              <div className="space-y-4">
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    GST Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="text" placeholder="18AABCT1234H1Z0" className="w-full px-4 py-2 rounded-lg bg-black/30 border font-mono focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#D4A843' }} />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    CIN <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="text" placeholder="U72900KA2020PTC123456" className="w-full px-4 py-2 rounded-lg bg-black/30 border font-mono focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#D4A843' }} />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Authorized Authority Email <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="email" placeholder="auth@company.com" className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }} />
                </div>
              </div>
            </div>
          )}

          {currentStepIndex === 2 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                Company Registration Documents
              </h3>
              <Badge label="OCR processing on upload" type="warning" />
              <div className="space-y-4">
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                    Certificate of Incorporation
                  </label>
                  <FileUploadZone
                    label="Upload Certificate"
                    documentType="incorporation_certificate"
                    onDocumentProcessed={handleDocumentProcessed}
                  />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                    MOA / AOA
                  </label>
                  <FileUploadZone label="Upload MOA/AOA" />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                    Shareholding Pattern
                  </label>
                  <FileUploadZone label="Upload Shareholding" />
                </div>
              </div>
            </div>
          )}

          {currentStepIndex === 3 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                GST Filings
              </h3>
              <Badge label="Fraud Detection Notice" type="warning" />
              <div className="space-y-4">
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                    GSTR-3B
                  </label>
                  <FileUploadZone
                    label="Upload GSTR-3B"
                    documentType="gst_filing"
                    onDocumentProcessed={handleDocumentProcessed}
                  />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                    GSTR-1
                  </label>
                  <FileUploadZone
                    label="Upload GSTR-1"
                    documentType="gst_filing"
                    onDocumentProcessed={handleDocumentProcessed}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStepIndex === 4 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                Income Tax Returns
              </h3>
              <p style={{ color: '#64748B' }} className="text-sm">
                Upload ITR for last 3 years (FY wise):
              </p>
              <div className="space-y-4">
                {['FY 2023-24', 'FY 2022-23', 'FY 2021-22'].map((fy) => (
                  <div key={fy}>
                    <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                      {fy}
                    </label>
                    <FileUploadZone label={`Upload ${fy} ITR`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStepIndex === 5 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                Banking Data
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span style={{ color: '#F1F5F9' }} className="text-sm">
                    I declare that the bank account and statements are genuine
                  </span>
                </label>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                    Bank Statements (6-12 months) - Mandatory
                  </label>
                  <FileUploadZone
                    label="Upload Statements"
                    count={2}
                    documentType="bank_statement"
                    onDocumentProcessed={handleDocumentProcessed}
                  />
                </div>
                <label className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span style={{ color: '#F1F5F9' }} className="text-sm">
                    Include optional 3-year statements
                  </span>
                </label>
              </div>
            </div>
          )}

          {currentStepIndex === 6 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                Executive Identity
              </h3>
              <Badge label="MFA verified" type="success" />
              <div className="space-y-4">
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Aadhaar Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="password" placeholder="••••••••••••0123" className="w-full px-4 py-2 rounded-lg bg-black/30 border font-mono focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#D4A843' }} />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    PAN <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="text" placeholder="AAAPA5055K" className="w-full px-4 py-2 rounded-lg bg-black/30 border font-mono focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#D4A843' }} />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Corporate Role <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }}>
                    <option>Director</option>
                    <option>CEO</option>
                    <option>CFO</option>
                    <option>Authorized Signatory</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStepIndex === 7 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                Loan Request Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Loan Amount <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="number" placeholder="5000000" className="w-full px-4 py-2 rounded-lg bg-black/30 border font-mono focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#D4A843' }} />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Loan Type <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }}>
                    <option>Working Capital</option>
                    <option>Term Loan</option>
                    <option>Overdraft</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                  Purpose
                </label>
                <textarea placeholder="Describe the purpose" className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }} rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Collateral
                  </label>
                  <input type="text" placeholder="Property, Equipment" className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }} />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-medium mb-2">
                    Tenure (Months)
                  </label>
                  <input type="number" placeholder="36" className="w-full px-4 py-2 rounded-lg bg-black/30 border focus:outline-none focus:border-2" style={{ borderColor: '#1E2A3A', color: '#F1F5F9' }} />
                </div>
              </div>
            </div>
          )}

          {currentStepIndex === 8 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
                Loan History (Optional)
              </h3>
              <div>
                <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                  Previous Sanction Letters
                </label>
                <FileUploadZone label="Upload Sanction Letters" />
              </div>
              <div>
                <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                  Repayment Records
                </label>
                <FileUploadZone
                  label="Upload Repayment Records"
                  documentType="loan_history"
                  onDocumentProcessed={handleDocumentProcessed}
                />
              </div>
            </div>
          )}

          <div
            className="mt-8 rounded-lg p-6 space-y-6"
            style={{ backgroundColor: 'rgba(11, 15, 26, 0.65)', border: '1px solid #1E2A3A' }}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#F1F5F9' }}>
                  Connected Backend Review
                </h3>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  The original wizard stays the same. This panel just shows what the backend extracted and scored.
                </p>
              </div>
              <Badge label={requiredPayloadReady ? 'Scoring payload ready' : 'Waiting for scoring documents'} type={requiredPayloadReady ? 'success' : 'warning'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {([
                { key: 'monthly_revenue', label: 'Monthly Revenue', formatter: (value: number | boolean) => `INR ${Number(value).toLocaleString('en-IN')}` },
                { key: 'total_debt', label: 'Total Debt', formatter: (value: number | boolean) => `INR ${Number(value).toLocaleString('en-IN')}` },
                { key: 'emi', label: 'Monthly EMI', formatter: (value: number | boolean) => `INR ${Number(value).toLocaleString('en-IN')}` },
                { key: 'business_age_months', label: 'Business Age', formatter: (value: number | boolean) => `${value} months` },
                { key: 'gst_compliant', label: 'GST Compliant', formatter: (value: number | boolean) => (value ? 'Yes' : 'No') },
                { key: 'has_disputes', label: 'Past Disputes', formatter: (value: number | boolean) => (value ? 'Yes' : 'No') },
              ] as Array<{ key: keyof ExtractedPayload; label: string; formatter: (value: number | boolean) => string }>).map((field) => (
                (() => {
                  const fieldValue = extractedPayload[field.key];
                  return (
                    <div
                      key={field.key}
                      className="rounded-lg p-4"
                      style={{ backgroundColor: 'rgba(20, 25, 41, 0.9)', border: '1px solid #1E2A3A' }}
                    >
                      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>
                        {field.label}
                      </p>
                      <p className="text-base font-semibold" style={{ color: '#F1F5F9' }}>
                        {fieldValue === null ? 'Pending extraction' : field.formatter(fieldValue)}
                      </p>
                    </div>
                  );
                })()
              ))}
            </div>

            {processedDocuments.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>
                  Processed documents
                </p>
                <div className="flex flex-wrap gap-2">
                  {processedDocuments.map((document) => (
                    <span
                      key={document.source_document}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'rgba(45, 212, 160, 0.08)', border: '1px solid rgba(45, 212, 160, 0.25)', color: '#DDEDEA' }}
                    >
                      <CheckCircle2 size={14} style={{ color: '#2DD4A0' }} />
                      {document.source_document}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>
                  PDF-to-score flow
                </p>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  Upload incorporation, GST, bank statement, and repayment PDFs to unlock scoring.
                </p>
              </div>
            </div>

            {scoreError ? (
              <div className="flex items-start gap-2 text-sm" style={{ color: '#F59E0B' }}>
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{scoreError}</span>
              </div>
            ) : null}

            {scoreResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {[
                  { label: 'Rule Score', value: scoreResult.rule_score },
                  { label: 'PD', value: scoreResult.pd },
                  { label: 'Final Score', value: scoreResult.final_score },
                  { label: 'Risk Category', value: scoreResult.risk_category },
                  { label: 'Decision', value: scoreResult.decision },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg p-4"
                    style={{ backgroundColor: 'rgba(20, 25, 41, 0.9)', border: '1px solid #1E2A3A' }}
                  >
                    <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>
                      {item.label}
                    </p>
                    <p className="text-base font-semibold" style={{ color: '#F1F5F9' }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-lg p-5 space-y-4" style={{ backgroundColor: 'rgba(20, 25, 41, 0.9)', border: '1px solid #1E2A3A' }}>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="text-lg font-semibold" style={{ color: '#F1F5F9' }}>
                    GSTIN Explainable Score
                  </h4>
                  <p className="text-sm" style={{ color: '#64748B' }}>
                    This calls the new backend explainability endpoint without changing the wizard flow.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <input
                    type="text"
                    value={gstinInput}
                    onChange={(event) => setGstinInput(event.target.value.toUpperCase())}
                    placeholder="29ABCDE1000Z0"
                    className="px-4 py-2 rounded-lg bg-black/30 border font-mono focus:outline-none focus:border-2 min-w-[240px]"
                    style={{ borderColor: '#1E2A3A', color: '#D4A843' }}
                  />
                  <button
                    onClick={handleGstinScore}
                    disabled={gstinLoading}
                    className="px-5 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#1E2A3A', color: '#F1F5F9' }}
                  >
                    {gstinLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Clock size={16} />}
                    {gstinLoading ? 'Fetching...' : 'Get Explainable Score'}
                  </button>
                </div>
              </div>

              {gstinError ? (
                <div className="flex items-start gap-2 text-sm" style={{ color: '#F59E0B' }}>
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{gstinError}</span>
                </div>
              ) : null}

              {gstinResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                      { label: 'GSTIN', value: gstinResult.gstin },
                      { label: 'Credit Score', value: gstinResult.credit_score },
                      { label: 'Risk Band', value: gstinResult.risk_band },
                      { label: 'Risk Score', value: gstinResult.risk_score },
                      { label: 'Probability of Default', value: gstinResult.probability_of_default },
                      { label: 'Risk Category', value: gstinResult.risk_category },
                      { label: 'Recommended Loan', value: `INR ${Number(gstinResult.recommended_loan_amount).toLocaleString('en-IN')}` },
                      { label: 'Recommended Tenure', value: `${gstinResult.recommended_tenure_months} months` },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg p-4"
                        style={{ backgroundColor: 'rgba(11, 15, 26, 0.8)', border: '1px solid #1E2A3A' }}
                      >
                        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>
                          {item.label}
                        </p>
                        <p className="text-base font-semibold break-all" style={{ color: '#F1F5F9' }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className="rounded-lg p-4"
                      style={{ backgroundColor: 'rgba(11, 15, 26, 0.8)', border: '1px solid #1E2A3A' }}
                    >
                      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>
                        Fraud Flag
                      </p>
                      <p className="text-base font-semibold" style={{ color: gstinResult.fraud_flag ? '#F59E0B' : '#2DD4A0' }}>
                        {gstinResult.fraud_flag ? 'Flagged' : 'Clear'}
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-4"
                      style={{ backgroundColor: 'rgba(11, 15, 26, 0.8)', border: '1px solid #1E2A3A' }}
                    >
                      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>
                        Fraud Score
                      </p>
                      <p className="text-base font-semibold" style={{ color: '#F1F5F9' }}>
                        {gstinResult.fraud_score}
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-4"
                      style={{ backgroundColor: 'rgba(11, 15, 26, 0.8)', border: '1px solid #1E2A3A' }}
                    >
                      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>
                        Linked GSTINs
                      </p>
                      <p className="text-base font-semibold break-all" style={{ color: '#F1F5F9' }}>
                        {gstinResult.linked_gstins.length > 0 ? gstinResult.linked_gstins.join(', ') : 'None'}
                      </p>
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: gstinResult.fraud_flag ? 'rgba(245, 158, 11, 0.08)' : 'rgba(45, 212, 160, 0.06)',
                      border: gstinResult.fraud_flag ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(45, 212, 160, 0.2)',
                    }}
                  >
                    <p className="text-sm font-semibold mb-2" style={{ color: '#F1F5F9' }}>
                      Fraud assessment
                    </p>
                    <p className="text-sm" style={{ color: '#DDEDEA' }}>
                      {gstinResult.fraud_summary}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-3" style={{ color: '#F1F5F9' }}>
                      Top reasons
                    </p>
                    <div className="space-y-2">
                      {gstinResult.top_reasons.map((reason: string, index: number) => (
                        <div
                          key={`${reason}-${index}`}
                          className="flex items-start gap-3 rounded-lg p-3"
                          style={{ backgroundColor: 'rgba(11, 15, 26, 0.8)', border: '1px solid #1E2A3A' }}
                        >
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: '#D4A843', color: '#0B0F1A' }}
                          >
                            {index + 1}
                          </span>
                          <p className="text-sm" style={{ color: '#DDEDEA' }}>
                            {reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: '#64748B' }}>
                    Freshness timestamp: {gstinResult.score_freshness_timestamp}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 mt-8 border-t" style={{ borderColor: '#1E2A3A' }}>
            <button
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: '#1E2A3A',
                color: '#F1F5F9',
                border: '1px solid #1E2A3A',
              }}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={handleCalculateScore}
                disabled={scoreLoading}
                className="px-5 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
                style={{ backgroundColor: '#0F1B2D', color: '#F8D36C', border: '1px solid #F8D36C' }}
              >
                {scoreLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={16} />}
                {scoreLoading ? 'Scoring...' : 'Score Documents'}
              </button>

              {currentStepIndex === STEPS.length - 1 ? (
                <button
                  onClick={handleInitiateSubmission}
                  className="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
                  style={{
                    backgroundColor: '#D4A843',
                    color: '#0B0F1A',
                  }}
                >
                  <Lock size={16} />
                  Submit Application
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
                  style={{
                    backgroundColor: '#D4A843',
                    color: '#0B0F1A',
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div
            className="rounded-lg p-8 max-w-2xl w-full animate-in fade-in zoom-in duration-300"
            style={{ backgroundColor: '#141929', border: '2px solid #1E2A3A' }}
          >
            {!submissionLocked ? (
              <>
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#F1F5F9' }}>
                  Complete Application Submission
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* OTP Verification */}
                  <div
                    className="p-6 rounded-lg"
                    style={{ backgroundColor: 'rgba(212, 168, 67, 0.05)', border: '1px solid #1E2A3A' }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Shield size={18} style={{ color: '#D4A843' }} />
                      <h3 className="font-bold" style={{ color: '#F1F5F9' }}>
                        OTP Verification
                      </h3>
                    </div>

                    <p style={{ color: '#64748B' }} className="text-sm mb-4">
                      Verification code sent to <span style={{ color: '#F1F5F9' }}>+91 XXXX XXXX 8542</span>
                    </p>

                    <div className="mb-4">
                      <label style={{ color: '#64748B' }} className="block text-sm mb-2">
                        Enter 6-digit OTP (use 123456 for demo)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full px-4 py-3 rounded-lg bg-black/30 border font-mono text-center text-lg tracking-widest focus:outline-none focus:border-2"
                        style={{
                          borderColor: otpVerified ? '#2DD4A0' : '#1E2A3A',
                          color: '#D4A843',
                        }}
                      />
                    </div>

                    <button
                      onClick={handleVerifyOtp}
                      disabled={otpValue.length !== 6 || otpVerified}
                      className="w-full py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: otpVerified ? '#2DD4A0' : '#D4A843',
                        color: otpVerified ? '#0B0F1A' : '#0B0F1A',
                      }}
                    >
                      {otpVerified ? (
                        <>
                          <CheckCircle2 size={16} />
                          Verified
                        </>
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                  </div>

                  {/* Co-Email Approval */}
                  <div
                    className="p-6 rounded-lg"
                    style={{ backgroundColor: 'rgba(100, 116, 139, 0.05)', border: '1px solid #1E2A3A' }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <FileText size={18} style={{ color: '#64748B' }} />
                      <h3 className="font-bold" style={{ color: '#F1F5F9' }}>
                        Co-Email Approval
                      </h3>
                    </div>

                    <p style={{ color: '#64748B' }} className="text-sm mb-4">
                      Approval from: <span style={{ color: '#F1F5F9' }} className="font-mono">
                        co-auth@techventures.com
                      </span>
                    </p>

                    <div
                      className="p-3 rounded-lg flex items-center justify-between mb-4"
                      style={{
                        backgroundColor: coEmailApproved ? 'rgba(45, 212, 160, 0.1)' : coEmailVerifying ? 'rgba(212, 168, 67, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                      }}
                    >
                      {coEmailVerifying ? (
                        <>
                          <Loader size={16} style={{ color: '#D4A843', animation: 'spin 1s linear infinite' }} />
                          <span style={{ color: '#D4A843' }} className="text-sm font-medium">
                            Awaiting approval...
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              color: coEmailApproved ? '#2DD4A0' : '#FACC15',
                            }}
                            className="text-sm font-medium"
                          >
                            {coEmailApproved ? '✓ Approved' : '⏳ Pending'}
                          </span>
                        </>
                      )}
                    </div>

                    <p style={{ color: '#64748B' }} className="text-xs">
                      Approval required from secondary stakeholder. Auto-simulated after OTP verification.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleFinalSubmit}
                  disabled={!otpVerified || !coEmailApproved}
                  className="w-full mt-6 py-3 rounded-lg font-bold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: otpVerified && coEmailApproved ? '#D4A843' : '#1E2A3A',
                    color: otpVerified && coEmailApproved ? '#0B0F1A' : '#64748B',
                  }}
                >
                  <Lock size={16} />
                  Complete Submission
                </button>

                <button
                  onClick={() => setShowSubmissionModal(false)}
                  className="w-full mt-2 py-2 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#64748B',
                    border: '1px solid #1E2A3A',
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="mb-6 flex justify-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#2DD4A0', animation: 'zoom-in 0.5s ease-out' }}
                  >
                    <Lock size={40} style={{ color: '#0B0F1A' }} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#F1F5F9' }}>
                  Application Submitted!
                </h3>
                <p style={{ color: '#64748B' }} className="mb-4">
                  Your loan application has been successfully submitted. You will receive a confirmation email shortly.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
