"use client";

import React from "react";

export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glassSize?: "none" | "sm" | "default" | "lg";
  glassEffect?: boolean;
}

export function LiquidGlassCard({
  className = "",
  glassSize = "default",
  children,
  ...props
}: LiquidGlassCardProps) {
  const paddingMap = {
    none: "",
    sm: "p-4",
    default: "p-5",
    lg: "p-8",
  };

  const padClass = paddingMap[glassSize] || "";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#121622]/80 backdrop-blur-md transition-all duration-300 hover:border-blue-500/50 hover:shadow-xl ${padClass} ${className}`}
      {...props}
    >
      <div className="relative z-10 flex flex-col h-full">{children}</div>
    </div>
  );
}
