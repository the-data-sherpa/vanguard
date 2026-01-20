"use client";

import { CreateTenantForm } from "@/components/admin/CreateTenantForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateTenantPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Tenant</h1>
          <p className="text-muted-foreground mt-1">
            Set up a new organization on the platform
          </p>
        </div>
      </div>

      {/* Form */}
      <CreateTenantForm />
    </div>
  );
}
