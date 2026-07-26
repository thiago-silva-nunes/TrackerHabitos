import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glass?: boolean;
}

export function Card({ children, glass = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border",
        glass
          ? "glass"
          : "bg-surface-1 border-white/6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
