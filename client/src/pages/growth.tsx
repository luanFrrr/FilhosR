import { useState } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useGrowthRecords, useCreateGrowthRecord } from "@/hooks/use-growth";
import { Header } from "@/components/layout/header";
import { GrowthChart } from "@/components/growth/growth-chart";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Scale, Ruler } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const recordSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  weight: z.coerce.number().min(0.1, "Peso inválido").optional(),
  height: z.coerce.number().min(1, "Altura inválida").optional(),
  headCircumference: z.coerce.number().optional(),
});

type RecordForm = z.infer<typeof recordSchema>;

export default function Growth() {
  const { activeChild } = useChildContext();
  const { data: records } = useGrowthRecords(activeChild?.id || 0);
  const createRecord = useCreateGrowthRecord();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"weight" | "height">("weight");

  const form = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = (data: RecordForm) => {
    if (!activeChild) return;
    
    createRecord.mutate({
      childId: activeChild.id,
      ...data,
      date: data.date, 
      weight: data.weight?.toString(),
      height: data.height?.toString(),
      headCircumference: data.headCircumference?.toString(),
    }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({ title: "Registro salvo com sucesso!", className: "bg-green-500 text-white border-none" });
      },
      onError: () => {
        toast({ title: "Erro ao salvar", variant: "destructive" });
      }
    });
  };

  const weightData = records?.filter(r => r.weight).map(r => ({ date: r.date, value: Number(r.weight) })) || [];
  const heightData = records?.filter(r => r.height).map(r => ({ date: r.date, value: Number(r.height) })) || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Crescimento" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        
        {/* Chart Selector */}
        <div className="bg-muted/50 p-1 rounded-xl flex gap-1">
          <button 
            onClick={() => setActiveTab("weight")}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
              activeTab === "weight" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Scale className="w-4 h-4" /> Peso
          </button>
          <button 
            onClick={() => setActiveTab("height")}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
              activeTab === "height" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Ruler className="w-4 h-4" /> Altura
          </button>
        </div>

        {/* Chart Card */}
        <div className="mobile-card">
          <div className="mb-6">
             <h2 className="text-lg font-display font-bold text-foreground">
               {activeTab === "weight" ? "Evolução do Peso" : "Evolução da Altura"}
             </h2>
             <p className="text-sm text-muted-foreground">Últimos registros</p>
          </div>
          <GrowthChart 
            data={activeTab === "weight" ? weightData : heightData} 
            color={activeTab === "weight" ? "#3b82f6" : "#10b981"} 
            unit={activeTab === "weight" ? "kg" : "cm"}
          />
        </div>

        {/* History List */}
        <div>
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-display font-bold text-lg">Histórico</h3>
             <Dialog open={open} onOpenChange={setOpen}>
               <DialogTrigger asChild>
                 <Button size="sm" className="bg-primary text-white rounded-full px-4 gap-2 hover:bg-primary/90">
                   <Plus className="w-4 h-4" /> Novo Registro
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-md rounded-2xl">
                 <DialogHeader>
                   <DialogTitle>Registrar Medidas</DialogTitle>
                 </DialogHeader>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                   <div className="space-y-2">
                     <Label>Data</Label>
                     <Input type="date" {...form.register("date")} className="input-field" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Peso (kg)</Label>
                       <Input type="number" step="0.01" placeholder="Ex: 12.5" {...form.register("weight")} className="input-field" />
                     </div>
                     <div className="space-y-2">
                       <Label>Altura (cm)</Label>
                       <Input type="number" step="0.1" placeholder="Ex: 85" {...form.register("height")} className="input-field" />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label>Perímetro Cefálico (cm) <span className="text-muted-foreground text-xs">(Opcional)</span></Label>
                     <Input type="number" step="0.1" {...form.register("headCircumference")} className="input-field" />
                   </div>
                   <Button type="submit" className="w-full btn-primary" disabled={createRecord.isPending}>
                     {createRecord.isPending ? "Salvando..." : "Salvar Registro"}
                   </Button>
                 </form>
               </DialogContent>
             </Dialog>
          </div>

          <div className="space-y-3">
            {records?.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
              <div key={record.id} className="bg-white p-4 rounded-xl border border-border flex justify-between items-center">
                <div>
                  <p className="font-bold text-foreground">{format(new Date(record.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(record.date), { locale: ptBR, addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                   {record.weight && <div className="text-sm"><span className="font-bold text-blue-600">{record.weight}kg</span></div>}
                   {record.height && <div className="text-sm"><span className="font-bold text-emerald-600">{record.height}cm</span></div>}
                </div>
              </div>
            ))}
            {(!records || records.length === 0) && (
              <p className="text-center text-muted-foreground py-8">Nenhum registro ainda.</p>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
