/**
 * @fileoverview src/app/page.tsx
 * Home page with welcome message and navigation links
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Service Request System</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Submit and track your service requests efficiently. Get support when you need it most.
        </p>
      </div>

      <div className="flex justify-center">
        <Card className="p-8 space-y-6 max-w-md w-full">
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Get Started</h2>
            <p className="text-muted-foreground">
              Submit and track your service requests. Create new tickets, monitor progress, and communicate with our support team.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/login">
                Get Started
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium text-primary hover:underline" href="/login">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
