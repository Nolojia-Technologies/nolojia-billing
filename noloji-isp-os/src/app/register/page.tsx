'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Phone, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Request Access</CardTitle>
          <CardDescription className="text-center">
            Account registration is managed by administrators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-4">
              To get access to Noloji ISP OS, please contact your administrator or the Nolojia team.
            </p>
            <p>
              If you are a landlord or ISP partner, your account will be created by the system administrator
              and you will receive your login credentials.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">Contact Information</h3>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <a href="mailto:support@nolojia.com" className="text-primary hover:underline">
                  support@nolojia.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <a href="tel:+254700000000" className="text-primary hover:underline">
                  +254 700 000 000
                </a>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
