import { useChildContext } from "@/hooks/use-child-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { User, Bell, Shield, LogOut } from "lucide-react";

export default function Settings() {
  const { activeChild } = useChildContext();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Ajustes" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Profile Section */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
           <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
             <User className="w-8 h-8 text-muted-foreground" />
           </div>
           <div>
             <h2 className="font-display font-bold text-lg">Responsável</h2>
             <p className="text-sm text-muted-foreground">admin@exemplo.com</p>
           </div>
        </div>

        {/* Settings Groups */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-2">App</h3>
          
          <div className="bg-white rounded-xl border border-border overflow-hidden">
             <div className="p-4 flex items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                     <Bell className="w-4 h-4" />
                   </div>
                   <Label>Notificações de Vacinas</Label>
                </div>
                <Switch defaultChecked />
             </div>
             <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                     <Shield className="w-4 h-4" />
                   </div>
                   <Label>Modo Privacidade</Label>
                </div>
                <Switch />
             </div>
          </div>
        </div>

        {activeChild && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-2">Criança Ativa</h3>
            <div className="bg-white p-4 rounded-xl border border-border">
               <p className="font-bold">{activeChild.name}</p>
               <p className="text-sm text-muted-foreground mt-1">Tema: {activeChild.theme}</p>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 mt-8">
           <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </main>
    </div>
  );
}
