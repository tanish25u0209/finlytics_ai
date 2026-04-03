export interface CurrentUser {
  name: string;
  role: 'borrower' | 'credit_manager';
  email: string;
  avatar: string;
}

export interface ApplicationState {
  applicationId: string;
  companyName: string;
  loanAmount: number;
  currentStage: 'submitted' | 'kyc' | 'financial_analysis' | 'site_visit' | 'cam_generation' | 'committee_review' | 'decision';
  riskLevel: 'low' | 'medium' | 'high';
  submittedAt: string;
  lastUpdated: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AgentStatus {
  status: 'running' | 'idle' | 'complete';
  lastRun: string;
  findings: string;
  anomalyDetected?: boolean;
}

export interface AgentStatuses {
  kyc: AgentStatus;
  financial: AgentStatus;
  fraud: AgentStatus & { anomalyDetected: boolean };
  decision: AgentStatus;
}

export interface Notification {
  id: string;
  from: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AppContextState {
  currentUser: CurrentUser;
  applicationState: ApplicationState;
  formData: Record<string, any>;
  documents: Document[];
  agentStatuses: AgentStatuses;
  notifications: Notification[];
}

export type AppAction =
  | { type: 'UPDATE_USER_ROLE'; payload: 'borrower' | 'credit_manager' }
  | { type: 'UPDATE_APPLICATION_STATE'; payload: Partial<ApplicationState> }
  | { type: 'UPDATE_FORM_DATA'; payload: { stepKey: string; data: any } }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'UPDATE_AGENT_STATUS'; payload: { agent: keyof AgentStatuses; data: Partial<AgentStatus> } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'SUBMIT_APPLICATION'; payload: any };
