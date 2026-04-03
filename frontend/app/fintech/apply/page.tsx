'use client';

import { useAppContext } from '@/lib/AppContext';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, ChevronLeft, Upload, CheckCircle2, Clock, AlertCircle,
  Shield, Lock, FileText, Eye, EyeOff, Loader
} from 'lucide-react';
import { useState, useEffect } from 'react';

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

const Badge = ({ label, type = 'info' }) => {
  const colors = {
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

const FileUploadZone = ({ label, count = 1 }) => {
  const [uploaded, setUploaded] = useState(Array(count).fill(null));
  const [uploading, setUploading] = useState(Array(count).fill(false));

  const handleUpload = (index) => {
    setUploading((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setTimeout(() => {
      setUploaded((prev) => {
        const next = [...prev];
        next[index] = `document_${index}.pdf`;
        return next;
      });
      setUploading((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }, 1500);
  };

  return (
    <div className="space-y-3">
      {Array(count)
        .fill(null)
        .map((_, index) => (
          <div
            key={index}
            onClick={() => handleUpload(index)}
            className="relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:opacity-80"
            style={{
              borderColor: uploaded[index] ? '#D4A843' : '#1E2A3A',
              backgroundColor: uploaded[index] ? 'rgba(212, 168, 67, 0.05)' : 'transparent',
            }}
          >
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
    </div>
  );
};

export default function ApplyPage() {
  const router = useRouter();
  const { state, updateApplicationState, addNotification } = useAppContext();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [coEmailVerifying, setCoEmailVerifying] = useState(false);
  const [coEmailApproved, setCoEmailApproved] = useState(false);
  const [submissionLocked, setSubmissionLocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentStep = STEPS[currentStepIndex];

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
    setShowSubmissionModal(true);
  };

  const handleVerifyOtp = () => {
    if (otpValue === '123456') {
      setOtpVerified(true);
    }
  };

  const handleFinalSubmit = () => {
    if (otpVerified && !coEmailApproved) {
      setCoEmailVerifying(true);
      setTimeout(() => {
        setCoEmailApproved(true);
        setCoEmailVerifying(false);
      }, 2000);
      return;
    }

    if (otpVerified && coEmailApproved) {
      setSubmissionLocked(true);
      
      // Generate mock application ID
      const applicationId = `FAIM-2024-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      
      // Update application state
      updateApplicationState({
        applicationId,
        currentStage: 'kyc',
        submittedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        companyName: 'TechVentures Inc.',
        loanAmount: 500000,
        riskLevel: 'medium',
      });

      // Add success notification
      addNotification({
        id: `notif-${Date.now()}`,
        from: 'System',
        message: 'Application submitted successfully. KYC verification started.',
        timestamp: new Date().toISOString(),
        read: false,
      });

      setTimeout(() => {
        router.push('/fintech/dashboard');
      }, 1500);
    }
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
                  <FileUploadZone label="Upload Certificate" />
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
                  <FileUploadZone label="Upload GSTR-3B" />
                </div>
                <div>
                  <label style={{ color: '#64748B' }} className="block text-sm font-bold mb-3 uppercase">
                    GSTR-1
                  </label>
                  <FileUploadZone label="Upload GSTR-1" />
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
                  <FileUploadZone label="Upload Statements" count={2} />
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
                <FileUploadZone label="Upload Repayment Records" />
              </div>
            </div>
          )}

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
