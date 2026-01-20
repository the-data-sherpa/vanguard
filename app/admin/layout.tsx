"use client";

import { PlatformAdminGuard } from "@/components/admin/PlatformAdminGuard";
import { AdminLayout } from "@/components/layout/AdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </PlatformAdminGuard>
  );
}
