import { Link, useLocation } from 'wouter';
import { Button } from '@repo/ui';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, LogOut, User, TrendingUp, Users, Lightbulb, MessageSquare, LayoutDashboard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { hasRole } from '../lib/hasRole';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const [location] = useLocation();

  const { data: userData } = useQuery<any>({
    queryKey: ['/api/user/me'],
    enabled: !!user,
  });

  const currentUser = (userData as any)?.data;
  const isAuthor = hasRole(currentUser, 'AUTHOR');

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  const navItems = [
    ...(isAuthor ? [{ href: '/author-dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { href: '/discover', label: 'Discover', icon: TrendingUp },
    { href: '/clubs', label: 'Clubs', icon: Users },
    { href: '/pitches', label: 'Pitches', icon: Lightbulb },
    { href: '/books', label: 'Books', icon: BookOpen },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
  ];

  return (
    <header className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/discover">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">Book Pitch</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
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
                    data-testid={`nav-${item.label.toLowerCase()}`}
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
                <Link href="/profile">
                  <Button variant="ghost" size="icon" data-testid="button-profile">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Log Out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
