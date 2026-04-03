import { AppContextState } from './types/app';

export const mockData: AppContextState = {
  auth: {
    isAuthenticated: false,
    initialized: false,
  },
  currentUser: {
    name: 'Guest User',
    role: 'borrower',
    email: 'guest@finserv-aim.demo',
    avatar: '',
  },
  applicationState: {
    applicationId: '',
    companyName: '',
    loanAmount: 0,
    currentStage: 'submitted',
    riskLevel: 'medium',
    submittedAt: '',
    lastUpdated: '',
  },
  formData: {},
  documents: [],
  agentStatuses: {
    kyc: {
      status: 'idle',
      lastRun: '',
      findings: 'KYC verification will begin after the application is submitted.',
    },
    financial: {
      status: 'idle',
      lastRun: '',
      findings: 'Financial analysis will begin after documents are uploaded.',
    },
    fraud: {
      status: 'idle',
      lastRun: '',
      findings: 'Fraud analysis will run after GSTIN scoring or backend review.',
      anomalyDetected: false,
    },
    decision: {
      status: 'idle',
      lastRun: '',
      findings: 'Pending completion of all prerequisite analyses.',
    },
  },
  notifications: [],
};
