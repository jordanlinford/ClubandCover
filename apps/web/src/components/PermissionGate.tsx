import { ReactNode } from 'react';

interface PermissionGateProps {
  hasPermission: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ hasPermission, fallback, children }: PermissionGateProps) {
  if (!hasPermission) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}
