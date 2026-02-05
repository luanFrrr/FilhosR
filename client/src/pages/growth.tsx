import { useState } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useGrowthRecords, useCreateGrowthRecord, useUpdateGrowthRecord, useArchiveGrowthRecord } from "@/hooks/use-growth";
import { Header } from "@/components/layout/header";
import { GrowthChart } from "@/components/growth/growth-chart";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Plus, Scale, Ruler, Pencil, Archive } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { cn, parseLocalDate, parseDecimalBR, formatDecimalBR } from "@/lib/utils";
import type { GrowthRecord } from "@shared/schema";

const recordSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  weight: z.string().optional(),
  height: z.string().optional(),
  headCircumference: z.string().optional(),
});

type RecordForm = z.infer<typeof recordSchema>;

export default function Growth() {
  const { activeChild } = useChildContext();
  const { data: records } = useGrowthRecords(activeChild?.id || 0);
  const createRecord = useCreateGrowthRecord();
  const updateRecord = useUpdateGrowthRecord();
  const archiveRecord = useArchiveGrowthRecord();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GrowthRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"weight" | "height">("weight");

  const form = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const editForm = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      date: "",
      weight: undefined,
      height: undefined,
      headCircumference: undefined,
    },
  });

  const onSubmit = (data: RecordForm) => {
    if (!activeChild) return;
    
    // Fix date offset issue
    const date = data.date.includes('T') ? data.date.split('T')[0] : data.date;
    
    const weight = parseDecimalBR(data.weight);
    const height = parseDecimalBR(data.height);
    const head = parseDecimalBR(data.headCircumference);
    
    createRecord.mutate({
      childId: activeChild.id,
      date, 
      weight: weight !== null ? weight.toString() : undefined,
      height: height !== null ? height.toString() : undefined,
      headCircumference: head !== null ? head.toString() : undefined,
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

  const onEdit = (record: GrowthRecord) => {
    setSelectedRecord(record);
    editForm.reset({
      date: record.date,
      weight: record.weight ? formatDecimalBR(record.weight) : undefined,
      height: record.height ? formatDecimalBR(record.height, 1) : undefined,
      headCircumference: record.headCircumference ? formatDecimalBR(record.headCircumference, 1) : undefined,
    });
    setEditOpen(true);
  };

  const onEditSubmit = (data: RecordForm) => {
    if (!activeChild || !selectedRecord) return;
    
    // Fix date offset issue
    const date = data.date.includes('T') ? data.date.split('T')[0] : data.date;
    
    const weight = parseDecimalBR(data.weight);
    const height = parseDecimalBR(data.height);
    const head = parseDecimalBR(data.headCircumference);
    
    updateRecord.mutate({
      id: selectedRecord.id,
      childId: activeChild.id,
      date,
      weight: weight !== null ? weight.toString() : undefined,
      height: height !== null ? height.toString() : undefined,
      headCircumference: head !== null ? head.toString() : undefined,
    }, {
      onSuccess: () => {
        setEditOpen(false);
        setSelectedRecord(null);
        toast({ title: "Registro atualizado!", className: "bg-green-500 text-white border-none" });
      },
      onError: () => {
        toast({ title: "Erro ao atualizar", variant: "destructive" });
      }
    });
  };

  const onArchive = (record: GrowthRecord) => {
    setSelectedRecord(record);
    setArchiveOpen(true);
  };

  const confirmArchive = () => {
    if (!activeChild || !selectedRecord) return;
    
    archiveRecord.mutate({
      id: selectedRecord.id,
      childId: activeChild.id,
    }, {
      onSuccess: () => {
        setArchiveOpen(false);
        setSelectedRecord(null);
        toast({ title: "Registro arquivado", description: "O registro foi ocultado do histórico.", className: "bg-amber-500 text-white border-none" });
      },
      onError: () => {
        toast({ title: "Erro ao arquivar", variant: "destructive" });
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
            data-testid="tab-weight"
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
              activeTab === "weight" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Scale className="w-4 h-4" /> Peso
          </button>
          <button 
            onClick={() => setActiveTab("height")}
            data-testid="tab-height"
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
             <p className="text-sm text-muted-foreground">Cada registro ajuda a acompanhar o desenvolvimento {activeChild?.gender === "female" ? "dela" : "dele"}</p>
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
                 <Button size="sm" data-testid="button-new-record" className="bg-primary text-white rounded-full px-4 gap-2 hover:bg-primary/90">
                   <Plus className="w-4 h-4" /> Novo Registro
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-md rounded-2xl">
                 <DialogHeader>
                   <DialogTitle>Registrar Medidas</DialogTitle>
                   <DialogDescription>Adicione as medidas de crescimento da criança.</DialogDescription>
                 </DialogHeader>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                   <div className="space-y-2">
                     <Label>Data</Label>
                     <Input type="date" {...form.register("date")} className="input-field" data-testid="input-date" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Peso (kg)</Label>
                       <Controller
                         name="weight"
                         control={form.control}
                         render={({ field }) => (
                           <DecimalInput
                             placeholder="Ex: 12,5"
                             value={field.value || ""}
                             onChange={field.onChange}
                             className="input-field"
                             data-testid="input-weight"
                           />
                         )}
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Altura (cm)</Label>
                       <Controller
                         name="height"
                         control={form.control}
                         render={({ field }) => (
                           <DecimalInput
                             placeholder="Ex: 85,0"
                             value={field.value || ""}
                             onChange={field.onChange}
                             decimalPlaces={1}
                             className="input-field"
                             data-testid="input-height"
                           />
                         )}
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label>Perímetro Cefálico (cm) <span className="text-muted-foreground text-xs">(Opcional)</span></Label>
                     <Controller
                       name="headCircumference"
                       control={form.control}
                       render={({ field }) => (
                         <DecimalInput
                           placeholder="Ex: 35,5"
                           value={field.value || ""}
                           onChange={field.onChange}
                           decimalPlaces={1}
                           className="input-field"
                           data-testid="input-head"
                         />
                       )}
                     />
                   </div>
                   <Button type="submit" data-testid="button-save-record" className="w-full btn-primary" disabled={createRecord.isPending}>
                     {createRecord.isPending ? "Salvando..." : "Salvar Registro"}
                   </Button>
                 </form>
               </DialogContent>
             </Dialog>
          </div>

          <div className="space-y-3">
            {records?.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
              <div key={record.id} data-testid={`growth-record-${record.id}`} className="bg-white p-4 rounded-xl border border-border flex justify-between items-center">
                <div>
                  <p className="font-bold text-foreground">{format(parseLocalDate(record.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(parseLocalDate(record.date), { locale: ptBR, addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                     {record.weight && <div className="text-sm"><span className="font-bold text-blue-600">{formatDecimalBR(record.weight)}kg</span></div>}
                     {record.height && <div className="text-sm"><span className="font-bold text-emerald-600">{formatDecimalBR(record.height, 1)}cm</span></div>}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => onEdit(record)}
                      data-testid={`button-edit-${record.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => onArchive(record)}
                      data-testid={`button-archive-${record.id}`}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {(!records || records.length === 0) && (
              <p className="text-center text-muted-foreground py-8">Nenhum registro ainda.</p>
            )}
          </div>
        </div>

      </main>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>Altere os valores desejados e salve.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" {...editForm.register("date")} className="input-field" data-testid="edit-input-date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Controller
                  name="weight"
                  control={editForm.control}
                  render={({ field }) => (
                    <DecimalInput
                      placeholder="Ex: 12,5"
                      value={field.value || ""}
                      onChange={field.onChange}
                      className="input-field"
                      data-testid="edit-input-weight"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Controller
                  name="height"
                  control={editForm.control}
                  render={({ field }) => (
                    <DecimalInput
                      placeholder="Ex: 85,0"
                      value={field.value || ""}
                      onChange={field.onChange}
                      decimalPlaces={1}
                      className="input-field"
                      data-testid="edit-input-height"
                    />
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Perímetro Cefálico (cm) <span className="text-muted-foreground text-xs">(Opcional)</span></Label>
              <Controller
                name="headCircumference"
                control={editForm.control}
                render={({ field }) => (
                  <DecimalInput
                    placeholder="Ex: 35,5"
                    value={field.value || ""}
                    onChange={field.onChange}
                    decimalPlaces={1}
                    className="input-field"
                    data-testid="edit-input-head"
                  />
                )}
              />
            </div>
            <Button type="submit" data-testid="button-update-record" className="w-full btn-primary" disabled={updateRecord.isPending}>
              {updateRecord.isPending ? "Salvando..." : "Atualizar Registro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro será ocultado do histórico. Ele não será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-archive">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmArchive} 
              data-testid="button-confirm-archive"
              className="bg-amber-600 hover:bg-amber-700"
            >
              {archiveRecord.isPending ? "Arquivando..." : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
