import { Link, useLocation } from 'wouter';
import { Button } from '@repo/ui';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, LogOut, User, TrendingUp, Users, Lightbulb, MessageSquare, LayoutDashboard, Menu, X, Bell, Repeat, CreditCard, Gift, BarChart3, Plus, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { hasRole } from '../lib/hasRole';
import { useState } from 'react';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: userData } = useQuery<any>({
    queryKey: ['/api/user/me'],
    enabled: !!user,
  });

  const { data: notificationData } = useQuery<any>({
    queryKey: ['/api/notifications/unread/count'],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const currentUser = (userData as any)?.data;
  const isAuthor = hasRole(currentUser, 'AUTHOR');
  const isClubAdmin = hasRole(currentUser, 'CLUB_ADMIN');
  const unreadCount = (notificationData as any)?.data?.count || 0;

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  const authorNavItems = [
    { href: '/author-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pitches', label: 'My Pitches', icon: Lightbulb },
    { href: '/analytics/author', label: 'Analytics', icon: BarChart3 },
    { href: '/swaps', label: 'Book Swaps', icon: Repeat },
    { href: '/billing', label: 'Billing', icon: CreditCard },
  ];

  const baseNavItems = [
    { href: '/discover', label: 'Discover', icon: TrendingUp },
    { href: '/clubs', label: 'Clubs', icon: Users },
    { href: '/books', label: 'Books', icon: BookOpen },
  ];

  const readerNavItems = [
    { href: '/referrals', label: 'Referrals', icon: Gift },
  ];

  const commonNavItems = [
    { href: '/messages', label: 'Messages', icon: MessageSquare },
  ];

  const allNavItems = [
    ...(isAuthor ? authorNavItems : []),
    ...baseNavItems,
    ...readerNavItems,
    ...commonNavItems,
  ];

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/discover">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">Club & Cover</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || location.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer hover-elevate active-elevate-2 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {user && (
              <>
                {/* Quick Actions */}
                {isAuthor && (
                  <Link href="/pitches/new">
                    <Button variant="default" size="sm" className="gap-2 hidden lg:flex" data-testid="button-create-pitch">
                      <Plus className="h-4 w-4" />
                      Create Pitch
                    </Button>
                  </Link>
                )}
                {isClubAdmin && (
                  <Link href="/clubs/new">
                    <Button variant="default" size="sm" className="gap-2 hidden lg:flex" data-testid="button-create-club">
                      <UserPlus className="h-4 w-4" />
                      Create Club
                    </Button>
                  </Link>
                )}

                {/* Notifications */}
                <Link href="/profile">
                  <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications" aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}>
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center" data-testid="text-notification-count" aria-label={`${unreadCount} unread notifications`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>

                {/* Profile */}
                <Link href="/profile">
                  <Button variant="ghost" size="icon" data-testid="button-profile" aria-label="User profile">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>

                {/* Mobile Menu Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  data-testid="button-mobile-menu"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>

                {/* Logout (Desktop) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 hidden md:flex"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">Log Out</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && user && (
          <nav className="md:hidden border-t py-4" data-testid="nav-mobile">
            <div className="space-y-1">
              {/* Quick Actions Mobile */}
              {isAuthor && (
                <Link href="/pitches/new">
                  <a
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="nav-mobile-create-pitch"
                  >
                    <Plus className="h-5 w-5" />
                    Create Pitch
                  </a>
                </Link>
              )}
              {isClubAdmin && (
                <Link href="/clubs/new">
                  <a
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="nav-mobile-create-club"
                  >
                    <UserPlus className="h-5 w-5" />
                    Create Club
                  </a>
                </Link>
              )}

              {/* All Nav Items */}
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || location.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid={`nav-mobile-${item.label.toLowerCase().replace(/ /g, '-')}`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </a>
                  </Link>
                );
              })}

              {/* Logout Mobile */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer w-full"
                data-testid="nav-mobile-logout"
              >
                <LogOut className="h-5 w-5" />
                Log Out
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
