import { AppContextState } from './app';

export const mockData: AppContextState = {
  currentUser: {
    name: 'Sarah Chen',
    role: 'borrower',
    email: 'sarah.chen@techventures.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  },
  applicationState: {
    applicationId: 'APP-2024-001',
    companyName: 'TechVentures Inc.',
    loanAmount: 500000,
    currentStage: 'kyc',
    riskLevel: 'medium',
    submittedAt: '2024-03-15T10:30:00Z',
    lastUpdated: '2024-03-18T14:20:00Z',
  },
  formData: {
    step1_company: {
      companyName: 'TechVentures Inc.',
      registrationNumber: 'REG-2020-12345',
      industry: 'Technology',
      yearsInBusiness: 4,
      description: 'Cloud-based SaaS platform for business automation',
    },
    step2_directors: {
      directors: [
        { name: 'Sarah Chen', designation: 'CEO', ownership: 60 },
        { name: 'Michael Park', designation: 'CTO', ownership: 40 },
      ],
    },
    step3_financial: {
      annualRevenue: 2500000,
      annualExpenses: 1800000,
      netProfit: 700000,
      totalAssets: 3200000,
    },
    step4_facilities: {
      bankingRelationships: ['National Bank', 'Global Finance'],
      existingLoans: 250000,
      collateral: 1500000,
    },
    step5_documents: {
      businessRegistration: true,
      financialStatements: true,
      directorsPan: true,
      incomeProof: true,
    },
    step6_purpose: {
      loanPurpose: 'Working Capital & Expansion',
      amount: 500000,
      repaymentPeriod: 5,
    },
    step7_repayment: {
      expectedCashFlow: 150000,
      repaymentSchedule: 'quarterly',
    },
    step8_covenants: {
      financialCovenants: true,
      operationalCovenants: true,
      reportingFrequency: 'quarterly',
    },
    step9_review: {
      allDocumentsProvided: true,
      declarationAccepted: true,
      consentProvided: true,
    },
  },
  documents: [
    {
      id: 'doc-1',
      name: 'Company Registration Certificate',
      type: 'pdf',
      uploadedAt: '2024-03-15T10:30:00Z',
      status: 'approved',
    },
    {
      id: 'doc-2',
      name: 'FY2023 Financial Statements',
      type: 'pdf',
      uploadedAt: '2024-03-15T11:00:00Z',
      status: 'approved',
    },
    {
      id: 'doc-3',
      name: 'Director PAN Cards',
      type: 'pdf',
      uploadedAt: '2024-03-15T11:15:00Z',
      status: 'approved',
    },
    {
      id: 'doc-4',
      name: 'Bank Statements (6 months)',
      type: 'pdf',
      uploadedAt: '2024-03-16T09:00:00Z',
      status: 'pending',
    },
  ],
  agentStatuses: {
    kyc: {
      status: 'complete',
      lastRun: '2024-03-18T14:00:00Z',
      findings: 'KYC verification completed successfully. All directors verified in public registry.',
    },
    financial: {
      status: 'running',
      lastRun: '2024-03-18T14:15:00Z',
      findings: 'Analyzing financial trends and cash flow patterns...',
    },
    fraud: {
      status: 'complete',
      lastRun: '2024-03-18T13:30:00Z',
      findings: 'No anomalies detected. Company has clean transaction history.',
      anomalyDetected: false,
    },
    decision: {
      status: 'idle',
      lastRun: '2024-03-17T10:00:00Z',
      findings: 'Pending completion of all prerequisite analyses.',
    },
  },
  notifications: [
    {
      id: 'notif-1',
      from: 'KYC Agent',
      message: 'KYC verification completed successfully',
      timestamp: '2024-03-18T14:00:00Z',
      read: true,
    },
    {
      id: 'notif-2',
      from: 'Financial Agent',
      message: 'Financial analysis in progress',
      timestamp: '2024-03-18T14:15:00Z',
      read: false,
    },
    {
      id: 'notif-3',
      from: 'Credit Manager',
      message: 'Your application is being reviewed',
      timestamp: '2024-03-18T12:00:00Z',
      read: false,
    },
    {
      id: 'notif-4',
      from: 'System',
      message: 'Please upload bank statements for the past 6 months',
      timestamp: '2024-03-17T16:30:00Z',
      read: true,
    },
  ],
};
