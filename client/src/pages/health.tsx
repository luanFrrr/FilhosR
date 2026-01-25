import { useState } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useVaccines, useHealthRecords, useCreateHealthRecord, useUpdateVaccine } from "@/hooks/use-health";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Clock, AlertCircle, Syringe, Thermometer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { InsertVaccine } from "@shared/routes";

export default function Health() {
  const { activeChild } = useChildContext();
  const { data: vaccines } = useVaccines(activeChild?.id || 0);
  const { data: sickRecords } = useHealthRecords(activeChild?.id || 0);
  const updateVaccine = useUpdateVaccine();
  const createSickRecord = useCreateHealthRecord();
  const { toast } = useToast();
  const [sickDialogOpen, setSickDialogOpen] = useState(false);

  // Sick Form
  const sickForm = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      symptoms: "",
      medication: "",
      notes: ""
    }
  });

  const onSickSubmit = (data: any) => {
    if(!activeChild) return;
    createSickRecord.mutate({ childId: activeChild.id, ...data }, {
      onSuccess: () => {
        setSickDialogOpen(false);
        sickForm.reset();
        toast({ title: "Registro salvo!" });
      }
    });
  };

  const handleVaccineStatus = (vaccine: typeof vaccines[0]) => {
    const newStatus = vaccine.status === "completed" ? "pending" : "completed";
    updateVaccine.mutate({ 
      id: vaccine.id, 
      childId: vaccine.childId, 
      status: newStatus,
      administeredDate: newStatus === "completed" ? new Date().toISOString() : undefined
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Saúde" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6">
        <Tabs defaultValue="vaccines" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 h-auto rounded-xl">
            <TabsTrigger value="vaccines" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
              <Syringe className="w-4 h-4 mr-2" /> Carteira Vacinal
            </TabsTrigger>
            <TabsTrigger value="history" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
              <Thermometer className="w-4 h-4 mr-2" /> Histórico Doenças
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vaccines" className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-900 text-sm">Mantenha em dia</h4>
                <p className="text-xs text-blue-700 mt-1">Marque as vacinas como concluídas para ganhar pontos de "Guardião da Saúde".</p>
              </div>
            </div>

            <div className="space-y-3">
              {vaccines?.sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()).map((vaccine) => {
                const isLate = vaccine.status === 'pending' && new Date(vaccine.scheduledDate) < new Date();
                
                return (
                  <div 
                    key={vaccine.id} 
                    className={cn(
                      "group p-4 rounded-xl border transition-all duration-200 flex items-center justify-between",
                      vaccine.status === 'completed' 
                        ? "bg-green-50/50 border-green-100 opacity-80" 
                        : isLate 
                          ? "bg-white border-orange-200 shadow-sm border-l-4 border-l-orange-400" 
                          : "bg-white border-border shadow-sm"
                    )}
                  >
                    <div>
                      <h4 className={cn("font-bold text-sm mb-1", vaccine.status === 'completed' && "line-through text-muted-foreground")}>
                        {vaccine.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Prevista: {format(new Date(vaccine.scheduledDate), "dd/MM/yyyy")}</span>
                      </div>
                      {isLate && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full mt-2 inline-block">Atrasada</span>}
                    </div>

                    <button
                      onClick={() => handleVaccineStatus(vaccine)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        vaccine.status === 'completed' 
                          ? "bg-green-500 text-white shadow-lg shadow-green-500/30" 
                          : "bg-muted text-muted-foreground hover:bg-primary hover:text-white"
                      )}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
              {(!vaccines || vaccines.length === 0) && <p className="text-center py-8 text-muted-foreground">Nenhuma vacina cadastrada.</p>}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold">Registros</h3>
              <Dialog open={sickDialogOpen} onOpenChange={setSickDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary rounded-full">+ Registrar</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                   <DialogHeader>
                     <DialogTitle>Registrar Sintoma/Doença</DialogTitle>
                   </DialogHeader>
                   <form onSubmit={sickForm.handleSubmit(onSickSubmit)} className="space-y-4 pt-4">
                     <div className="space-y-2">
                       <Label>Data</Label>
                       <Input type="date" {...sickForm.register("date")} className="input-field" />
                     </div>
                     <div className="space-y-2">
                       <Label>O que a criança sentiu? (Sintomas)</Label>
                       <Textarea {...sickForm.register("symptoms", { required: true })} className="input-field min-h-[80px]" placeholder="Ex: Febre alta, tosse..." />
                     </div>
                     <div className="space-y-2">
                       <Label>Medicação (Opcional)</Label>
                       <Input {...sickForm.register("medication")} className="input-field" placeholder="Ex: Paracetamol 5ml" />
                     </div>
                     <Button type="submit" className="w-full btn-primary" disabled={createSickRecord.isPending}>Salvar</Button>
                   </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {sickRecords?.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
                <div key={record.id} className="bg-white p-5 rounded-xl border border-border shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-md">
                      {format(new Date(record.date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground text-lg mb-1">{record.symptoms}</h4>
                  {record.medication && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                      <Syringe className="w-4 h-4" />
                      <span>{record.medication}</span>
                    </div>
                  )}
                </div>
              ))}
              {(!sickRecords || sickRecords.length === 0) && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
                  <p className="text-muted-foreground">Nenhum registro de doença. <br/>Saúde de ferro! 💪</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
