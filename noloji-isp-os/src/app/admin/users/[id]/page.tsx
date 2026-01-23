"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Edit,
  Shield,
  Building2,
  Globe,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  Key,
  Loader2,
} from "lucide-react";
import { userManagementService } from "@/services/user-management-service";
import type { User as UserType, UserRole } from "@/types/landlord";

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  nolojia_staff: "Nolojia Staff",
  full_isp: "ISP Partner",
  landlord_admin: "Landlord Admin",
  landlord_staff: "Landlord Staff",
};

const roleColors: Record<UserRole, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  nolojia_staff: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  full_isp: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  landlord_admin: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  landlord_staff: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

const roleIcons: Record<UserRole, React.ReactNode> = {
  super_admin: <Shield className="h-4 w-4" />,
  nolojia_staff: <Shield className="h-4 w-4" />,
  full_isp: <Globe className="h-4 w-4" />,
  landlord_admin: <Building2 className="h-4 w-4" />,
  landlord_staff: <User className="h-4 w-4" />,
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await userManagementService.getUserById(userId);
        setUser(data);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch user",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleResetPassword = async () => {
    try {
      const newPassword = await userManagementService.resetUserPassword(userId);
      toast({
        title: "Password Reset",
        description: `New temporary password: ${newPassword}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">User not found</p>
        <Link href="/admin/users">
          <Button variant="link">Back to Users</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.full_name || "User Details"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetPassword}>
            <Key className="mr-2 h-4 w-4" />
            Reset Password
          </Button>
          <Link href={`/admin/users/${userId}/edit`}>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </Button>
          </Link>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || ""}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-medium">
                  {(user.full_name || user.email)?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-xl">{user.full_name || "No name"}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={roleColors[user.role]}>
                  <span className="mr-1">{roleIcons[user.role]}</span>
                  {roleLabels[user.role]}
                </Badge>
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{user.phone || "Not provided"}</p>
              </div>
            </div>
          </div>

          {/* Organization/Landlord Info */}
          {(user.organization || user.landlord) && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Assignment</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {user.organization && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Organization</p>
                      <p className="font-medium">{user.organization.name}</p>
                    </div>
                  </div>
                )}
                {user.landlord && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Landlord</p>
                      <p className="font-medium">{user.landlord.contact_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Activity</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">{formatDate(user.last_login)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(user.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
