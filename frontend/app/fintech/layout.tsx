'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAppContext } from '@/lib/AppContext';

const borrowerPaths = ['/fintech/apply', '/fintech/dashboard'];
const managerPaths = ['/fintech/manager', '/fintech/agents'];

const isAllowedPath = (pathname: string, allowedPaths: string[]) =>
  allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export default function FintechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useAppContext();

  const isAuthPage = pathname === '/fintech';
  const defaultPath = state.currentUser.role === 'borrower' ? '/fintech/dashboard' : '/fintech/manager';
  const roleAllowed = state.currentUser.role === 'borrower'
    ? isAllowedPath(pathname, borrowerPaths)
    : isAllowedPath(pathname, managerPaths);

  useEffect(() => {
    if (!state.auth.initialized) {
      return;
    }

    if (isAuthPage) {
      if (state.auth.isAuthenticated) {
        router.replace(defaultPath);
      }
      return;
    }

    if (!state.auth.isAuthenticated) {
      router.replace('/fintech');
      return;
    }

    if (!roleAllowed) {
      router.replace(defaultPath);
    }
  }, [defaultPath, isAuthPage, roleAllowed, router, state.auth.initialized, state.auth.isAuthenticated]);

  if (!state.auth.initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0F1A', color: '#D4A843' }}>
        Preparing secure workspace...
      </div>
    );
  }

  if (isAuthPage) {
    return <div style={{ backgroundColor: '#0B0F1A', minHeight: '100vh' }}>{children}</div>;
  }

  if (!state.auth.isAuthenticated || !roleAllowed) {
    return <div style={{ backgroundColor: '#0B0F1A', minHeight: '100vh' }} />;
  }

  return (
    <div style={{ backgroundColor: '#0B0F1A' }}>
      <Navbar />
      <main style={{ paddingTop: '64px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
