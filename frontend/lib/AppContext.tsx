'use client';

import React, { createContext, useReducer, useCallback, ReactNode } from 'react';
import { AppContextState, AppAction } from './types/app';
import { appReducer } from './appReducer';
import { mockData } from './mockData';

export interface AppContextType {
  state: AppContextState;
  dispatch: React.Dispatch<AppAction>;
  updateUserRole: (role: 'borrower' | 'credit_manager') => void;
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

  const updateUserRole = useCallback((role: 'borrower' | 'credit_manager') => {
    dispatch({ type: 'UPDATE_USER_ROLE', payload: role });
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
