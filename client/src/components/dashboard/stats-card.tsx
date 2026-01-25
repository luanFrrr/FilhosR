import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: string; // class name for bg color
  delay?: number;
}

export function StatsCard({ title, value, subtitle, icon, color = "bg-white", delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={cn("mobile-card flex flex-col justify-between h-full min-h-[140px]", color)}
    >
      <div className="flex justify-between items-start">
        <div className="p-2.5 rounded-xl bg-background/50 text-foreground backdrop-blur-sm shadow-sm border border-black/5">
          {icon}
        </div>
      </div>
      
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-bold font-display text-foreground">{value}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
