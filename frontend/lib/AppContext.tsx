'use client';

import React, { createContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import { AppContextState, AppAction, CurrentUser, UserRole } from './types/app';
import { appReducer } from './appReducer';
import { mockData } from './mockData';

const AUTH_USERS_KEY = 'finserv-aim-auth-users';
const AUTH_SESSION_KEY = 'finserv-aim-auth-session';

type StoredAuthUser = CurrentUser & { password: string };

const buildAvatarFallback = (name: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect width="100%" height="100%" fill="#D4A843" rx="12" />
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0B0F1A">
        ${name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join('') || 'FA'}
      </text>
    </svg>
  `)}`;

const defaultRouteByRole = (role: UserRole) =>
  role === 'borrower' ? '/fintech/dashboard' : '/fintech/manager';

const demoUsers: StoredAuthUser[] = [
  {
    name: 'Aarav Enterprises',
    email: 'owner@msme.com',
    role: 'borrower',
    avatar: buildAvatarFallback('Aarav Enterprises'),
    password: 'demo123',
  },
  {
    name: 'Priya Sharma',
    email: 'manager@bank.com',
    role: 'credit_manager',
    avatar: buildAvatarFallback('Priya Sharma'),
    password: 'demo123',
  },
];

const safeReadUsers = (): StoredAuthUser[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWriteUsers = (users: StoredAuthUser[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  }
};

const safeWriteSession = (user: CurrentUser | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
};

export interface AppContextType {
  state: AppContextState;
  dispatch: React.Dispatch<AppAction>;
  updateUserRole: (role: UserRole) => void;
  login: (params: { email: string; password: string; role: UserRole }) => { ok: boolean; message: string; redirectTo?: string };
  register: (params: { name: string; email: string; password: string; role: UserRole }) => { ok: boolean; message: string; redirectTo?: string };
  logout: () => void;
  updateApplicationState: (data: Partial<AppContextState['applicationState']>) => void;
  updateFormData: (stepKey: string, data: any) => void;
  addDocument: (doc: AppContextState['documents'][0]) => void;
  updateAgentStatus: (agent: keyof AppContextState['agentStatuses'], data: Partial<any>) => void;
  addNotification: (notif: AppContextState['notifications'][0]) => void;
  markNotificationRead: (id: string) => void;
  getUnreadCount: () => number;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, mockData);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!window.localStorage.getItem(AUTH_USERS_KEY)) {
      safeWriteUsers(demoUsers);
    }

    try {
      const rawSession = window.localStorage.getItem(AUTH_SESSION_KEY);
      if (rawSession) {
        const sessionUser = JSON.parse(rawSession) as CurrentUser;
        dispatch({ type: 'HYDRATE_AUTH', payload: { currentUser: sessionUser, isAuthenticated: true } });
        return;
      }
    } catch {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
    }

    dispatch({ type: 'HYDRATE_AUTH', payload: { currentUser: mockData.currentUser, isAuthenticated: false } });
  }, []);

  const updateUserRole = useCallback((role: UserRole) => {
    dispatch({ type: 'UPDATE_USER_ROLE', payload: role });
  }, []);

  const login = useCallback(
    ({ email, password, role }: { email: string; password: string; role: UserRole }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const user = safeReadUsers().find(
        (entry) =>
          entry.email.toLowerCase() === normalizedEmail &&
          entry.password === password &&
          entry.role === role
      );

      if (!user) {
        return {
          ok: false,
          message: 'No matching account found for this role. Please check your email, password, and selected role.',
        };
      }

      const sessionUser: CurrentUser = {
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || buildAvatarFallback(user.name),
      };

      safeWriteSession(sessionUser);
      dispatch({ type: 'LOGIN', payload: sessionUser });

      return {
        ok: true,
        message: 'Login successful.',
        redirectTo: defaultRouteByRole(sessionUser.role),
      };
    },
    []
  );

  const register = useCallback(
    ({ name, email, password, role }: { name: string; email: string; password: string; role: UserRole }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const users = safeReadUsers();
      const existingUser = users.find(
        (entry) => entry.email.toLowerCase() === normalizedEmail && entry.role === role
      );

      if (existingUser) {
        return {
          ok: false,
          message: 'An account with this email already exists for the selected role.',
        };
      }

      const sessionUser: CurrentUser = {
        name: name.trim(),
        email: normalizedEmail,
        role,
        avatar: buildAvatarFallback(name.trim()),
      };

      const nextUsers = [
        ...users,
        {
          ...sessionUser,
          password,
        },
      ];

      safeWriteUsers(nextUsers);
      safeWriteSession(sessionUser);
      dispatch({ type: 'LOGIN', payload: sessionUser });

      return {
        ok: true,
        message: 'Registration successful.',
        redirectTo: defaultRouteByRole(role),
      };
    },
    []
  );

  const logout = useCallback(() => {
    safeWriteSession(null);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateApplicationState = useCallback((data: Partial<AppContextState['applicationState']>) => {
    dispatch({ type: 'UPDATE_APPLICATION_STATE', payload: data });
  }, []);

  const updateFormData = useCallback((stepKey: string, data: any) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: { stepKey, data } });
  }, []);

  const addDocument = useCallback((doc: AppContextState['documents'][0]) => {
    dispatch({ type: 'ADD_DOCUMENT', payload: doc });
  }, []);

  const updateAgentStatus = useCallback(
    (agent: keyof AppContextState['agentStatuses'], data: Partial<any>) => {
      dispatch({ type: 'UPDATE_AGENT_STATUS', payload: { agent, data } });
    },
    []
  );

  const addNotification = useCallback((notif: AppContextState['notifications'][0]) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notif });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, []);

  const getUnreadCount = useCallback(() => {
    return state.notifications.filter((n) => !n.read).length;
  }, [state.notifications]);

  const value: AppContextType = {
    state,
    dispatch,
    updateUserRole,
    login,
    register,
    logout,
    updateApplicationState,
    updateFormData,
    addDocument,
    updateAgentStatus,
    addNotification,
    markNotificationRead,
    getUnreadCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextType {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
