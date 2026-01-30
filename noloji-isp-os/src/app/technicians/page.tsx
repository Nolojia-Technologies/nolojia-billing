"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserCheck,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Wrench,
  CheckCircle,
  AlertCircle,
  Users
} from "lucide-react";

// Mock data for technicians
const mockTechnicians = [
  {
    id: "TECH-001",
    name: "David Rodriguez",
    email: "david.rodriguez@noloji.com",
    phone: "+1 (555) 123-7890",
    status: "available",
    currentLocation: "Downtown Springfield",
    specialization: "Fiber Installation",
    experience: "5 years",
    rating: 4.8,
    completedJobs: 247,
    activeJobs: 0,
    nextAppointment: "Today, 2:00 PM",
    skills: ["Fiber Splicing", "ONT Installation", "Testing"]
  },
  {
    id: "TECH-002",
    name: "Sarah Chen",
    email: "sarah.chen@noloji.com",
    phone: "+1 (555) 456-7890",
    status: "on-job",
    currentLocation: "North Springfield - Oak Ave",
    specialization: "Network Maintenance",
    experience: "3 years",
    rating: 4.9,
    completedJobs: 189,
    activeJobs: 1,
    nextAppointment: "Tomorrow, 9:00 AM",
    skills: ["Troubleshooting", "Equipment Repair", "Testing"]
  },
  {
    id: "TECH-003",
    name: "Mike Thompson",
    email: "mike.thompson@noloji.com",
    phone: "+1 (555) 789-0123",
    status: "on-job",
    currentLocation: "West Springfield - Elm St",
    specialization: "Equipment Installation",
    experience: "7 years",
    rating: 4.7,
    completedJobs: 342,
    activeJobs: 2,
    nextAppointment: "Today, 4:30 PM",
    skills: ["Router Setup", "WiFi Configuration", "Troubleshooting"]
  },
  {
    id: "TECH-004",
    name: "Jennifer Park",
    email: "jennifer.park@noloji.com",
    phone: "+1 (555) 321-6540",
    status: "off-duty",
    currentLocation: "Off Duty",
    specialization: "Field Supervisor",
    experience: "8 years",
    rating: 5.0,
    completedJobs: 156,
    activeJobs: 0,
    nextAppointment: "Monday, 8:00 AM",
    skills: ["Team Management", "Quality Control", "Training"]
  }
];

const statusConfig = {
  available: { color: "default", label: "Available" },
  "on-job": { color: "secondary", label: "On Job" },
  "off-duty": { color: "outline", label: "Off Duty" },
  busy: { color: "destructive", label: "Busy" }
} as const;

export default function TechniciansPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technicians</h1>
          <p className="text-muted-foreground">
            Field technician management and work order assignments
          </p>
        </div>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Technician</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Ready for assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Jobs</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">
              Currently working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-muted-foreground">
              Customer satisfaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Technician Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Field Team</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                <Input
                  placeholder="Search technicians..."
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTechnicians.map((tech) => (
              <div
                key={tech.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-medium text-primary">
                      {tech.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{tech.name}</h3>
                      <Badge variant={statusConfig[tech.status as keyof typeof statusConfig].color}>
                        {statusConfig[tech.status as keyof typeof statusConfig].label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ⭐ {tech.rating}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Wrench className="h-3 w-3" />
                        <span>{tech.specialization}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{tech.experience}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{tech.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{tech.currentLocation}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Skills: {tech.skills.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-4 text-sm">
                      <div>
                        <p className="font-medium">{tech.completedJobs} completed</p>
                        <p className="text-muted-foreground">{tech.activeJobs} active jobs</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{tech.nextAppointment}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Plus className="h-8 w-8 text-primary" />
            <h3 className="font-medium">New Work Order</h3>
            <p className="text-sm text-muted-foreground text-center">
              Create installation task
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <MapPin className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Track Technicians</h3>
            <p className="text-sm text-muted-foreground text-center">
              View real-time locations
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Schedule Appointment</h3>
            <p className="text-sm text-muted-foreground text-center">
              Book customer visit
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Wrench className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Manage Equipment</h3>
            <p className="text-sm text-muted-foreground text-center">
              Track tools and inventory
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}