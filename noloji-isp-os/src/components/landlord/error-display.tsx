"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  title?: string;
}

export function ErrorDisplay({ error, onRetry, title = "Something went wrong" }: ErrorDisplayProps) {
  const isNetworkError = error.toLowerCase().includes('network') ||
    error.toLowerCase().includes('fetch') ||
    error.toLowerCase().includes('connection');

  return (
    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
            {isNetworkError ? (
              <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            )}
          </div>
          <h3 className="font-semibold text-lg text-red-800 dark:text-red-200 mb-2">
            {title}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-md">
            {error}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center text-center">
        {icon && (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            {icon}
          </div>
        )}
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            {description}
          </p>
        )}
        {action}
      </div>
    </Card>
  );
}
