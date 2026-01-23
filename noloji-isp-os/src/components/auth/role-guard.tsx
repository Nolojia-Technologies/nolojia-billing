"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/types/landlord";
import { Loader2, ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackUrl?: string;
  showAccessDenied?: boolean;
}

/**
 * Role-based route protection component.
 * Wraps content that should only be accessible to certain user roles.
 *
 * Usage:
 * <RoleGuard allowedRoles={['super_admin', 'nolojia_staff']}>
 *   <AdminContent />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  fallbackUrl = "/dashboard",
  showAccessDenied = true,
}: RoleGuardProps) {
  const { profile, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const hasAccess = profile && allowedRoles.includes(profile.role);

  useEffect(() => {
    if (!loading && isAuthenticated && !hasAccess && !showAccessDenied) {
      router.replace(fallbackUrl);
    }
  }, [loading, isAuthenticated, hasAccess, showAccessDenied, fallbackUrl, router]);

  // Show loading while checking auth/profile
  if (loading || (isAuthenticated && !profile)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated - should be handled by AppLayout
  if (!isAuthenticated) {
    return null;
  }

  // No access
  if (!hasAccess) {
    if (showAccessDenied) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access this page. If you believe this is an error,
            please contact your administrator.
          </p>
          <button
            onClick={() => router.push(fallbackUrl)}
            className="mt-6 text-primary hover:underline"
          >
            Go back to dashboard
          </button>
        </div>
      );
    }
    return null;
  }

  // Has access - render children
  return <>{children}</>;
}

/**
 * HOC version for page-level protection
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  fallbackUrl?: string
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard allowedRoles={allowedRoles} fallbackUrl={fallbackUrl}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

// Pre-configured guards for common use cases
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin", "nolojia_staff"]}>
      {children}
    </RoleGuard>
  );
}

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      {children}
    </RoleGuard>
  );
}

export function ISPGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin", "nolojia_staff", "full_isp"]}>
      {children}
    </RoleGuard>
  );
}

export function LandlordGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin", "nolojia_staff", "landlord_admin", "landlord_staff"]}>
      {children}
    </RoleGuard>
  );
}

export function LandlordAdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin", "nolojia_staff", "landlord_admin"]}>
      {children}
    </RoleGuard>
  );
}
