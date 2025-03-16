"use client";

import { cn } from "@/lib/utils";
import { BicepsFlexed, ChartLine, History, Library } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function Navbar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/protected/workouts",
      icon: <Library className="h-5 w-5" />,
      label: "Workouts",
    },
    {
      href: "/protected/exercises",
      icon: <BicepsFlexed className="h-5 w-5" />,
      label: "Exercises",
    },
    {
      href: "/protected/sessions",
      icon: <History className="h-5 w-5" />,
      label: "Sessions",
    },
    {
      href: "/protected/analytics",
      icon: <ChartLine className="h-5 w-5" />,
      label: "Analytics",
    },
  ];

  return (
    <div className="fixed bottom-0 w-full border-t border-border bg-background py-2 px-4 z-50">
      <nav className="max-w-md mx-auto">
        <ul className="flex justify-between items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.href} className="flex flex-col items-center">
                <Link href={item.href}>
                  <div className="flex flex-col items-center space-y-1">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      {item.icon}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
