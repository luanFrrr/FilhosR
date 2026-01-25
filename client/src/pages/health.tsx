import { useState } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useHealthRecords, useCreateHealthRecord, useUpdateHealthRecord, useArchiveHealthRecord } from "@/hooks/use-health";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Syringe, Thermometer, Shield, ChevronRight, Pencil, Archive } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { parseLocalDate } from "@/lib/utils";
import { useVaccineRecords } from "@/hooks/use-vaccines";
import type { HealthRecord } from "@shared/schema";

export default function Health() {
  const { activeChild } = useChildContext();
  const { data: sickRecords } = useHealthRecords(activeChild?.id || 0);
  const { data: vaccineRecords } = useVaccineRecords(activeChild?.id || 0);
  const createSickRecord = useCreateHealthRecord();
  const updateSickRecord = useUpdateHealthRecord();
  const archiveSickRecord = useArchiveHealthRecord();
  const { toast } = useToast();
  const [sickDialogOpen, setSickDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);

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
    
    if (editingRecord) {
      updateSickRecord.mutate({ 
        id: editingRecord.id, 
        childId: activeChild.id, 
        ...data,
        date: data.date.includes('T') ? data.date.split('T')[0] : data.date
      }, {
        onSuccess: () => {
          setSickDialogOpen(false);
          setEditingRecord(null);
          sickForm.reset();
          toast({ title: "Registro atualizado!" });
        }
      });
    } else {
      createSickRecord.mutate({ 
        childId: activeChild.id, 
        ...data,
        date: data.date.includes('T') ? data.date.split('T')[0] : data.date
      }, {
        onSuccess: () => {
          setSickDialogOpen(false);
          sickForm.reset();
          toast({ title: "Registro salvo!" });
        }
      });
    }
  };

  const handleEdit = (record: HealthRecord) => {
    setEditingRecord(record);
    sickForm.reset({
      date: record.date,
      symptoms: record.symptoms,
      medication: record.medication || "",
      notes: record.notes || ""
    });
    setSickDialogOpen(true);
  };

  const handleArchive = (record: HealthRecord) => {
    if(!activeChild) return;
    archiveSickRecord.mutate({ id: record.id, childId: activeChild.id }, {
      onSuccess: () => {
        toast({ title: "Registro arquivado!" });
      }
    });
  };

  const handleDialogClose = (open: boolean) => {
    setSickDialogOpen(open);
    if (!open) {
      setEditingRecord(null);
      sickForm.reset({
        date: new Date().toISOString().split('T')[0],
        symptoms: "",
        medication: "",
        notes: ""
      });
    }
  };

  const visibleRecords = sickRecords?.filter(r => !r.notes?.startsWith('[ARQUIVADO]'));

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Saúde" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6">
        <Tabs defaultValue="vaccines" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 h-auto rounded-xl">
            <TabsTrigger value="vaccines" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
              <Syringe className="w-4 h-4 mr-2" /> Vacinas
            </TabsTrigger>
            <TabsTrigger value="history" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
              <Thermometer className="w-4 h-4 mr-2" /> Doenças
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vaccines" className="space-y-4">
            <Link href="/vaccines">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5 rounded-2xl text-white shadow-lg active:scale-[0.98] transition-transform cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Carteira Vacinal</h3>
                      <p className="text-white/80 text-sm">
                        {vaccineRecords?.length || 0} vacinas registradas
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-white/70" />
                </div>
              </div>
            </Link>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <h4 className="font-bold text-blue-900 text-sm mb-2">Calendário do SUS</h4>
              <p className="text-xs text-blue-700">
                Registre todas as vacinas do seu filho baseado no Programa Nacional de Imunizações (PNI).
                Anexe fotos da carteirinha para manter tudo organizado.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold">Histórico de Doenças</h3>
              <Dialog open={sickDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-health-record">+ Registrar</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-sm mx-auto">
                   <DialogHeader>
                     <DialogTitle>{editingRecord ? "Editar Registro" : "Registrar Sintoma/Doença"}</DialogTitle>
                     <DialogDescription>
                       {editingRecord ? "Edite as informações do registro" : "Anote os sintomas e medicações"}
                     </DialogDescription>
                   </DialogHeader>
                   <form onSubmit={sickForm.handleSubmit(onSickSubmit)} className="space-y-4 pt-2">
                     <div className="space-y-2">
                       <Label>Data</Label>
                       <Input type="date" {...sickForm.register("date")} data-testid="input-health-date" />
                     </div>
                     <div className="space-y-2">
                       <Label>O que a criança sentiu? (Sintomas)</Label>
                       <Textarea 
                         {...sickForm.register("symptoms", { required: true })} 
                         className="min-h-[80px]" 
                         placeholder="Ex: Febre alta, tosse..."
                         data-testid="input-health-symptoms"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Medicação (Opcional)</Label>
                       <Input 
                         {...sickForm.register("medication")} 
                         placeholder="Ex: Paracetamol 5ml"
                         data-testid="input-health-medication"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Observações (Opcional)</Label>
                       <Textarea 
                         {...sickForm.register("notes")} 
                         className="min-h-[60px]" 
                         placeholder="Informações adicionais..."
                         data-testid="input-health-notes"
                       />
                     </div>
                     <Button 
                       type="submit" 
                       className="w-full" 
                       disabled={createSickRecord.isPending || updateSickRecord.isPending} 
                       data-testid="button-save-health"
                     >
                       {(createSickRecord.isPending || updateSickRecord.isPending) ? "Salvando..." : "Salvar"}
                     </Button>
                   </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {visibleRecords?.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
                <div key={record.id} className="bg-white p-5 rounded-xl border border-border shadow-sm" data-testid={`health-record-${record.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-md">
                      {format(parseLocalDate(record.date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(record)}
                        data-testid={`button-edit-health-${record.id}`}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-archive-health-${record.id}`}
                          >
                            <Archive className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-sm mx-auto">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Arquivar registro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O registro será permanentemente ocultado da lista.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleArchive(record)}
                              data-testid={`button-confirm-archive-${record.id}`}
                            >
                              Arquivar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <h4 className="font-bold text-foreground text-lg mb-1">{record.symptoms}</h4>
                  {record.medication && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                      <Syringe className="w-4 h-4" />
                      <span>{record.medication}</span>
                    </div>
                  )}
                  {record.notes && !record.notes.startsWith('[ARQUIVADO]') && (
                    <p className="text-sm text-muted-foreground mt-2">{record.notes}</p>
                  )}
                </div>
              ))}
              {(!visibleRecords || visibleRecords.length === 0) && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
                  <Thermometer className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum registro de doença.</p>
                  <p className="text-muted-foreground text-sm">Saúde de ferro!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
