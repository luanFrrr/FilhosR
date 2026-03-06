import { Link, useLocation } from "wouter";
import { Home, Star, Camera, Heart, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Início" },
    { href: "/memories", icon: Star, label: "Memórias" },
    { href: "/daily-photos", icon: Camera, label: "Foto" },
    { href: "/health", icon: Heart, label: "Saúde" },
    { href: "/settings", icon: Settings, label: "Ajustes" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const basePath = location.split("?")[0];
          const isActive =
            href === "/" ? basePath === "/" : basePath.startsWith(href);
          return (
            <Link key={href} href={href}>
              <button className="relative flex flex-col items-center justify-center w-full h-full py-1">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-[1px] w-12 h-1 bg-primary rounded-b-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-colors duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn("w-6 h-6", isActive && "fill-current/20")}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
