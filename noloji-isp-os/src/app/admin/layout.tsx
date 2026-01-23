"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/contexts/auth-context";
import {
    LayoutDashboard,
    Building2,
    Users,
    CreditCard,
    Settings,
    LogOut,
    Menu,
    X,
    Shield,
    Bell,
    Search,
    Globe
} from "lucide-react";

// Navigation groups
const navGroups = [
    {
        title: "Overview",
        items: [
            { name: "Dashboard", href: "/admin/landlords", icon: LayoutDashboard },
        ]
    },
    {
        title: "User Management",
        items: [
            { name: "All Users", href: "/admin/users", icon: Users },
            { name: "Landlords", href: "/admin/landlords/manage", icon: Building2 },
            { name: "ISPs", href: "/admin/isps", icon: Globe },
        ]
    },
    {
        title: "Finance",
        items: [
            { name: "Billing", href: "/admin/landlords/billing", icon: CreditCard },
        ]
    },
    {
        title: "Configuration",
        items: [
            { name: "Settings", href: "/admin/landlords/settings", icon: Settings },
        ]
    }
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { logout, profile } = useAuth();

    return (
        <AdminGuard>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
                    <Link href="/admin/landlords" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-bold">Nolojia</span>
                            <span className="text-xs text-gray-400 block -mt-1">Admin Portal</span>
                        </div>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden text-white hover:bg-gray-800"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                    {navGroups.map((group, index) => (
                        <div key={index}>
                            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                {group.title}
                            </p>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href ||
                                        (item.href !== "/admin/landlords" && pathname.startsWith(item.href));

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                                                isActive
                                                    ? "bg-orange-600 text-white"
                                                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                                            )}
                                            onClick={() => setSidebarOpen(false)}
                                        >
                                            <item.icon className="mr-3 h-5 w-5" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Quick Links */}
                    <div className="pt-4 border-t border-gray-800">
                        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Quick Links
                        </p>
                        <Link
                            href="/dashboard"
                            className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg"
                        >
                            <LayoutDashboard className="mr-3 h-5 w-5" />
                            Main ISP Dashboard
                        </Link>
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                                {profile?.full_name?.[0]?.toUpperCase() || 'A'}
                            </span>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium">{profile?.full_name || 'Admin'}</p>
                            <p className="text-xs text-gray-400 capitalize">
                                {profile?.role?.replace('_', ' ') || 'Admin'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
                        onClick={logout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        {/* Search */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-transparent border-none outline-none text-sm w-64"
                            />
                        </div>
                    </div>

                    {/* Right side of header */}
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </Button>
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Admin Portal
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                System Management
                            </p>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
        </AdminGuard>
    );
}
