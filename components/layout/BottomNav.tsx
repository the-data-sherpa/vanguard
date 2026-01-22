"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  onMoreClick?: () => void;
}

export function BottomNav({ items, onMoreClick }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href) ?? false;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
        {onMoreClick && (
          <button
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center flex-1 h-full min-w-[64px] text-muted-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs mt-1">More</span>
          </button>
        )}
      </div>
    </nav>
  );
}
