"use client";

import Image from "next/image";
import { Flame } from "lucide-react";

interface StatusHeaderProps {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
}

export function StatusHeader({ name, logoUrl, primaryColor }: StatusHeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={name}
              width={40}
              height={40}
              className="rounded"
            />
          ) : (
            <div
              className="h-10 w-10 rounded flex items-center justify-center"
              style={{ backgroundColor: primaryColor || "#f97316" }}
            >
              <Flame className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold">{name}</h1>
            <p className="text-sm text-muted-foreground">Service Status</p>
          </div>
        </div>
      </div>
    </header>
  );
}
