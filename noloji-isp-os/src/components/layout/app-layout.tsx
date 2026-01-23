"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/auth-context";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/'];

// Routes that have their own layouts (don't apply AppLayout sidebar/header)
const CUSTOM_LAYOUT_ROUTES = ['/admin', '/landlord'];

// Skeleton layout component for faster perceived loading
function LayoutSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r">
        <div className="p-4 border-b">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="ml-64">
        {/* Header skeleton */}
        <div className="h-16 border-b bg-card flex items-center px-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        {/* Content skeleton */}
        <div className="p-6 space-y-6">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Check if current route has its own custom layout (admin, landlord)
  const hasCustomLayout = CUSTOM_LAYOUT_ROUTES.some(route => pathname.startsWith(route));

  // Redirect to login if not authenticated and not on a public route
  React.useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, isPublicRoute, pathname]);

  // Show skeleton layout while checking authentication (better perceived performance)
  if (loading) {
    return isPublicRoute || hasCustomLayout ? null : <LayoutSkeleton />;
  }

  // For public routes (login, register), show content without sidebar/header
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For authenticated routes, show full layout
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // For routes with custom layouts (admin, landlord), just render children
  // These routes have their own layout files with sidebars/headers
  if (hasCustomLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Main Content Area */}
      <div
        className={cn(
          "sidebar-transition",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        {/* Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {/* Page Content */}
        <main className={cn("min-h-[calc(100vh-4rem)]", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}