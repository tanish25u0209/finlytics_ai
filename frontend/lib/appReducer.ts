import { AppContextState, AppAction } from './types/app';

const guestUser: AppContextState['currentUser'] = {
  name: 'Guest User',
  role: 'borrower',
  email: 'guest@finserv-aim.demo',
  avatar: '',
};

export function appReducer(state: AppContextState, action: AppAction): AppContextState {
  switch (action.type) {
    case 'HYDRATE_AUTH':
      return {
        ...state,
        auth: {
          isAuthenticated: action.payload.isAuthenticated,
          initialized: true,
        },
        currentUser: action.payload.currentUser,
      };

    case 'LOGIN':
      return {
        ...state,
        auth: {
          isAuthenticated: true,
          initialized: true,
        },
        currentUser: action.payload,
      };

    case 'LOGOUT':
      return {
        ...state,
        auth: {
          isAuthenticated: false,
          initialized: true,
        },
        currentUser: guestUser,
      };

    case 'UPDATE_USER_ROLE':
      return {
        ...state,
        currentUser: {
          ...state.currentUser,
          role: action.payload,
        },
        auth: {
          ...state.auth,
          initialized: true,
        },
      };

    case 'UPDATE_APPLICATION_STATE':
      return {
        ...state,
        applicationState: {
          ...state.applicationState,
          ...action.payload,
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.payload.stepKey]: action.payload.data,
        },
      };

    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: [...state.documents, action.payload],
      };

    case 'UPDATE_AGENT_STATUS':
      return {
        ...state,
        agentStatuses: {
          ...state.agentStatuses,
          [action.payload.agent]: {
            ...state.agentStatuses[action.payload.agent],
            ...action.payload.data,
            lastRun: new Date().toISOString(),
          },
        },
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((notif) =>
          notif.id === action.payload ? { ...notif, read: true } : notif
        ),
      };

    case 'SUBMIT_APPLICATION':
      return {
        ...state,
        applicationState: {
          ...state.applicationState,
          currentStage: 'submitted',
          submittedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
      };

    default:
      return state;
  }
}
