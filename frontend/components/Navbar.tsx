'use client';

import { useAppContext } from '@/lib/AppContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, LogOut } from 'lucide-react';

export default function Navbar() {
  const { state, logout, getUnreadCount } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const unreadCount = getUnreadCount();

  const navLinks =
    state.currentUser.role === 'borrower'
      ? [
          { href: '/fintech/apply', label: 'Apply' },
          { href: '/fintech/dashboard', label: 'My Dashboard' },
        ]
      : [
          { href: '/fintech/manager', label: 'Manager View' },
          { href: '/fintech/agents', label: 'Agent Monitor' },
        ];

  const handleLogout = () => {
    logout();
    router.push('/fintech');
  };

  const isActive = (href: string) => pathname === href;
  const homeHref = state.currentUser.role === 'borrower' ? '/fintech/dashboard' : '/fintech/manager';
  const avatar = state.currentUser.avatar?.trim();
  const initials = state.currentUser.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b" style={{
      backgroundColor: '#0B0F1A',
      borderColor: '#1E2A3A',
    }}>
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href={homeHref} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#D4A843' }}>
            <div className="w-4 h-4 rotate-45" style={{ backgroundColor: '#0B0F1A' }}></div>
          </div>
          <span className="text-base font-semibold tracking-wide" style={{ color: '#F1F5F9' }}>
            Finserv-AIM
          </span>
        </Link>

        {/* Center: Nav Links */}
        <div className="flex items-center gap-8">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link key={link.href} href={link.href} className="relative text-sm font-medium group">
                <span style={{ color: active ? '#D4A843' : '#64748B' }}>
                  {link.label}
                </span>
                {active && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 animate-in fade-in duration-300"
                    style={{ backgroundColor: '#D4A843' }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: User Controls */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative cursor-pointer">
            <Bell size={20} style={{ color: '#64748B' }} />
            {unreadCount > 0 && (
              <div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold animate-in scale-in duration-300"
                style={{ backgroundColor: '#D4A843', color: '#0B0F1A' }}
              >
                {unreadCount}
              </div>
            )}
          </div>

          {/* User Avatar & Info */}
          <div className="flex items-center gap-2">
            {avatar ? (
              <img
                src={avatar}
                alt={state.currentUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: '#D4A843', color: '#0B0F1A' }}
              >
                {initials || 'FA'}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-medium" style={{ color: '#F1F5F9' }}>
                {state.currentUser.name}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: state.currentUser.role === 'borrower' ? '#1E3A5F' : '#2D3F1D',
                  color: state.currentUser.role === 'borrower' ? '#60A5FA' : '#86EFAC',
                }}
              >
                {state.currentUser.role === 'borrower' ? 'Borrower' : 'Credit Manager'}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors hover:opacity-80 inline-flex items-center gap-2"
            style={{
              backgroundColor: '#1E2A3A',
              color: '#D4A843',
              border: '1px solid #D4A843',
            }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
