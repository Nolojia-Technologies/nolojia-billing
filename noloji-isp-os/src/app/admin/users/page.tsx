"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Shield,
  Building2,
  Globe,
  User,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const filters: {
        role?: UserRole;
        is_active?: boolean;
        search?: string;
      } = {};

      if (roleFilter !== "all") {
        filters.role = roleFilter as UserRole;
      }

      if (statusFilter === "active") {
        filters.is_active = true;
      } else if (statusFilter === "inactive") {
        filters.is_active = false;
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      const data = await userManagementService.getUsers(filters);
      setUsers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearch = () => {
    fetchUsers();
  };

  const handleDeactivate = async (userId: string) => {
    try {
      await userManagementService.deactivateUser(userId);
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate user",
        variant: "destructive",
      });
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await userManagementService.reactivateUser(userId);
      toast({
        title: "Success",
        description: "User reactivated successfully",
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reactivate user",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: string) => {
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
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage system users, ISPs, and landlords
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => ["super_admin", "nolojia_staff"].includes(u.role)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ISPs</CardTitle>
            <Globe className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "full_isp").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Landlords</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => ["landlord_admin", "landlord_staff"].includes(u.role)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            View and manage all system users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="nolojia_staff">Nolojia Staff</SelectItem>
                <SelectItem value="full_isp">ISP Partner</SelectItem>
                <SelectItem value="landlord_admin">Landlord Admin</SelectItem>
                <SelectItem value="landlord_staff">Landlord Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name || ""}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {(user.full_name || user.email)?.[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.phone && (
                              <p className="text-xs text-muted-foreground">{user.phone}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role]}>
                          <span className="mr-1">{roleIcons[user.role]}</span>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.last_login)}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href={`/admin/users/${user.id}`}>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                            </Link>
                            <Link href={`/admin/users/${user.id}/edit`}>
                              <DropdownMenuItem>Edit User</DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.is_active ? (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeactivate(user.id)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => handleReactivate(user.id)}
                              >
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
