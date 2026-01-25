import { useChildContext } from "@/hooks/use-child-context";
import { useChildren } from "@/hooks/use-children";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Baby, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

export function Header({ title, showChildSelector = true }: { title?: string, showChildSelector?: boolean }) {
  const { activeChild, setActiveChildId } = useChildContext();
  const { data: children } = useChildren();

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const displayDate = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 transition-all">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        {showChildSelector ? (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground mb-0.5">{displayDate}</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                    {activeChild?.photoUrl ? (
                      <img src={activeChild.photoUrl} alt={activeChild.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Baby className="w-5 h-5" />
                    )}
                  </div>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    {activeChild?.name || "Olá!"}
                  </h1>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-xl border-border/50 bg-white/95 backdrop-blur">
                {children?.map((child) => (
                  <DropdownMenuItem
                    key={child.id}
                    onClick={() => setActiveChildId(child.id)}
                    className="cursor-pointer py-3 focus:bg-primary/5 rounded-lg"
                    data-testid={`dropdown-child-${child.id}`}
                  >
                    <div className="flex items-center gap-3">
                       {child.photoUrl ? (
                         <img 
                           src={child.photoUrl} 
                           alt={child.name}
                           className="w-6 h-6 rounded-full object-cover"
                         />
                       ) : (
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                           child.theme === 'blue' ? 'bg-blue-400' : 
                           child.theme === 'pink' ? 'bg-pink-400' : 'bg-slate-400'
                         }`}>
                            {child.name.charAt(0).toUpperCase()}
                         </div>
                       )}
                       <span className={activeChild?.id === child.id ? "font-bold text-primary" : ""}>
                         {child.name}
                       </span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer py-3 text-primary font-medium focus:bg-primary/5 rounded-lg">
                  <Link href="/onboarding">+ Adicionar Criança</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <h1 className="text-xl font-display font-bold text-foreground">{title}</h1>
        )}
      </div>
    </header>
  );
}
