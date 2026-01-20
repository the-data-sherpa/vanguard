"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { PRICING } from "@/lib/stripe";

interface SubscribeButtonProps {
  tenantId: Id<"tenants">;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showPrice?: boolean;
}

export function SubscribeButton({
  tenantId,
  variant = "default",
  size = "default",
  className,
  showPrice = true,
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getCheckoutUrl = useAction(api.billing.getCheckoutUrl);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const returnUrl = window.location.href;
      const result = await getCheckoutUrl({
        tenantId,
        returnUrl,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        setError("Failed to create checkout session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Subscribe{showPrice ? ` - $${PRICING.monthlyPrice}/mo` : ""}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
