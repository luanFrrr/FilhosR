import { useState, useRef, useEffect, useMemo } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useSusVaccines, useVaccineRecords, useCreateVaccineRecord, useUpdateVaccineRecord, useDeleteVaccineRecord } from "@/hooks/use-vaccines";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Syringe, Plus, Check, Camera, X, ChevronRight, Shield, Edit2, Trash2, MapPin, Calendar, FileText, Image, Heart, Star, Sparkles, AlertTriangle } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getPendingVaccines, getPendingDosesByVaccine } from "@/lib/vaccineCheck";
import type { SusVaccine, VaccineRecord } from "@shared/schema";

const encouragingMessages = [
  "Cada vacina é um abraço de proteção!",
  "Você está construindo o escudo de saúde do seu filho!",
  "Amor de mãe/pai é também cuidar da saúde!",
  "Que orgulho! Seu pequeno está mais protegido!",
  "Vacininha dada, coração de mãe/pai tranquilo!",
];

const doseOptions = [
  "Dose única",
  "Dose ao nascer",
  "1ª dose",
  "2ª dose",
  "3ª dose",
  "1º reforço",
  "2º reforço",
  "Reforço",
  "Dose inicial",
  "Dose anual",
];

type FormMode = "create" | "edit";

export default function VaccineCard() {
  const { activeChild } = useChildContext();
  const { data: susVaccines, isLoading: loadingVaccines } = useSusVaccines();
  const { data: vaccineRecords } = useVaccineRecords(activeChild?.id || 0);
  const createRecord = useCreateVaccineRecord();
  const updateRecord = useUpdateVaccineRecord();
  const deleteRecord = useDeleteVaccineRecord();
  const { toast } = useToast();
  
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingRecord, setEditingRecord] = useState<VaccineRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<VaccineRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<VaccineRecord | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [selectedVaccine, setSelectedVaccine] = useState<SusVaccine | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationVaccine, setCelebrationVaccine] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      susVaccineId: "",
      dose: "",
      applicationDate: "",
      applicationPlace: "",
      notes: "",
    }
  });

  useEffect(() => {
    if (editingRecord && formMode === "edit") {
      form.reset({
        susVaccineId: String(editingRecord.susVaccineId),
        dose: editingRecord.dose,
        applicationDate: editingRecord.applicationDate,
        applicationPlace: editingRecord.applicationPlace || "",
        notes: editingRecord.notes || "",
      });
      setPhotoUrls(editingRecord.photoUrls || []);
      const vaccine = susVaccines?.find(v => v.id === editingRecord.susVaccineId);
      setSelectedVaccine(vaccine || null);
    }
  }, [editingRecord, formMode, susVaccines, form]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: "Escolha uma imagem menor que 15MB", variant: "destructive" });
        return;
      }
      try {
        const compressedImage = await compressImage(file, 1200, 0.8);
        setPhotoUrls(prev => [...prev, compressedImage]);
      } catch {
        toast({ title: "Erro ao processar imagem", variant: "destructive" });
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const openCreateForm = () => {
    setFormMode("create");
    setEditingRecord(null);
    form.reset({
      susVaccineId: "",
      dose: "",
      applicationDate: "",
      applicationPlace: "",
      notes: "",
    });
    setPhotoUrls([]);
    setSelectedVaccine(null);
    setFormOpen(true);
  };

  const openEditForm = (record: VaccineRecord) => {
    setFormMode("edit");
    setEditingRecord(record);
    setDetailRecord(null);
    setFormOpen(true);
  };

  const openDetail = (record: VaccineRecord) => {
    setDetailRecord(record);
  };

  const confirmDelete = (record: VaccineRecord) => {
    setRecordToDelete(record);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = () => {
    if (!recordToDelete || !activeChild) return;
    
    deleteRecord.mutate({ id: recordToDelete.id, childId: activeChild.id }, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        setRecordToDelete(null);
        setDetailRecord(null);
        toast({ title: "Registro excluído!" });
      },
      onError: () => {
        toast({ title: "Erro ao excluir", variant: "destructive" });
      }
    });
  };

  const onSubmit = (data: any) => {
    if (!activeChild) return;
    
    const payload = {
      susVaccineId: parseInt(data.susVaccineId),
      dose: data.dose,
      applicationDate: data.applicationDate,
      applicationPlace: data.applicationPlace || null,
      notes: data.notes || null,
      photoUrls: photoUrls.length > 0 ? photoUrls : null,
    };

    if (formMode === "edit" && editingRecord) {
      updateRecord.mutate({
        id: editingRecord.id,
        childId: activeChild.id,
        ...payload,
      }, {
        onSuccess: () => {
          setFormOpen(false);
          form.reset();
          setPhotoUrls([]);
          setSelectedVaccine(null);
          setEditingRecord(null);
          toast({ title: "Vacina atualizada!" });
        },
        onError: () => {
          toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
      });
    } else {
      const vaccineName = selectedVaccine?.name || "Vacina";
      createRecord.mutate({
        childId: activeChild.id,
        ...payload,
      }, {
        onSuccess: () => {
          setFormOpen(false);
          form.reset();
          setPhotoUrls([]);
          setSelectedVaccine(null);
          setCelebrationVaccine(vaccineName);
          setShowCelebration(true);
        },
        onError: () => {
          toast({ title: "Erro ao registrar", variant: "destructive" });
        }
      });
    }
  };

  const getVaccineName = (susVaccineId: number) => {
    return susVaccines?.find(v => v.id === susVaccineId)?.name || "Vacina";
  };

  const getVaccineInfo = (susVaccineId: number) => {
    return susVaccines?.find(v => v.id === susVaccineId);
  };

  const getRecordsForVaccine = (vaccineId: number) => {
    return vaccineRecords?.filter(r => r.susVaccineId === vaccineId) || [];
  };

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Carteira Vacinal" showChildSelector={false} />
        <div className="flex items-center justify-center p-6 text-center">
          <p className="text-muted-foreground">Selecione uma criança para ver a carteira vacinal.</p>
        </div>
      </div>
    );
  }

  const isPending = createRecord.isPending || updateRecord.isPending;
  
  // Calculate child age in months and pending vaccines
  const childAgeMonths = activeChild?.birthDate 
    ? differenceInMonths(new Date(), parseISO(activeChild.birthDate)) 
    : 0;
  
  const pendingByVaccine = useMemo((): Map<number, { vaccineId: number; vaccineName: string; dose: string; expectedMonths: number }[]> => {
    if (!susVaccines || !vaccineRecords || !activeChild?.birthDate) return new Map();
    return getPendingDosesByVaccine(susVaccines, vaccineRecords, childAgeMonths);
  }, [susVaccines, vaccineRecords, childAgeMonths, activeChild?.birthDate]);
  
  const pendingCount = useMemo(() => {
    let count = 0;
    pendingByVaccine.forEach(doses => count += doses.length);
    return count;
  }, [pendingByVaccine]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Carteira Vacinal" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">{activeChild.name}</h2>
              <p className="text-sm text-muted-foreground">
                {vaccineRecords?.length || 0} vacinas registradas
              </p>
            </div>
          </div>
          
          <Button size="icon" onClick={openCreateForm} data-testid="button-add-vaccine">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Pending vaccines alert */}
        {pendingCount > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-800">
                  {pendingCount} vacina{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Confira abaixo as vacinas destacadas em amarelo que já deveriam ter sido aplicadas para a idade de {childAgeMonths} {childAgeMonths === 1 ? 'mês' : 'meses'}.
                </p>
              </div>
            </div>
          </div>
        )}

        {loadingVaccines ? (
          <div className="text-center py-12 text-muted-foreground">Carregando vacinas...</div>
        ) : (
          <div className="space-y-3">
            {susVaccines?.map(vaccine => {
              const records = getRecordsForVaccine(vaccine.id);
              const hasRecords = records.length > 0;
              const pendingDoses = pendingByVaccine.get(vaccine.id) || [];
              const hasPendingDoses = pendingDoses.length > 0;
              
              return (
                <div 
                  key={vaccine.id}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all",
                    hasRecords && !hasPendingDoses
                      ? "border-green-200 bg-green-50/30" 
                      : hasPendingDoses 
                        ? "border-amber-300 bg-amber-50/50 shadow-sm" 
                        : "border-border"
                  )}
                  data-testid={`vaccine-card-${vaccine.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {hasRecords && !hasPendingDoses ? (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : hasPendingDoses ? (
                          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3 text-white" />
                          </div>
                        ) : null}
                        <h3 className={cn(
                          "font-bold",
                          hasPendingDoses ? "text-amber-800" : "text-foreground"
                        )}>{vaccine.name}</h3>
                        {hasPendingDoses && (
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                            {pendingDoses.length} pendente{pendingDoses.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {vaccine.diseasesPrevented}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Idade:</span> {vaccine.ageRange}
                      </p>
                      
                      {/* Show pending doses */}
                      {hasPendingDoses && (
                        <div className="mt-2 p-2 bg-amber-100/50 rounded-lg">
                          <p className="text-xs font-semibold text-amber-800 mb-1">Doses pendentes:</p>
                          {pendingDoses.map((dose, idx) => (
                            <p key={idx} className="text-xs text-amber-700">
                              {dose.dose} (prevista aos {dose.expectedMonths} {dose.expectedMonths === 1 ? 'mês' : 'meses'})
                            </p>
                          ))}
                        </div>
                      )}
                      
                      {hasRecords && (
                        <div className="mt-3 space-y-2">
                          {records.map(record => (
                            <button
                              key={record.id}
                              onClick={() => openDetail(record)}
                              className="w-full flex items-center gap-2 text-sm bg-white rounded-lg p-2 border border-green-100 hover:bg-green-50 transition-colors text-left"
                              data-testid={`vaccine-record-${record.id}`}
                            >
                              <Syringe className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="font-medium">{record.dose}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-muted-foreground">
                                {format(new Date(record.applicationDate), "dd/MM/yyyy")}
                              </span>
                              {record.photoUrls && record.photoUrls.length > 0 && (
                                <Camera className="w-3 h-3 text-muted-foreground ml-auto" />
                              )}
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(!vaccineRecords || vaccineRecords.length === 0) && !loadingVaccines && (
          <div className="text-center py-8 mt-4 bg-muted/30 rounded-xl">
            <Syringe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhuma vacina registrada ainda.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Clique no + para adicionar a primeira vacina.
            </p>
          </div>
        )}
      </main>

      <Dialog open={formOpen} onOpenChange={(isOpen) => {
        setFormOpen(isOpen);
        if (!isOpen) {
          form.reset();
          setPhotoUrls([]);
          setSelectedVaccine(null);
          setEditingRecord(null);
        }
      }}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" />
              {formMode === "edit" ? "Editar Vacina" : "Registrar Vacina"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "edit" ? "Atualize as informações da vacina" : "Registre uma vacina aplicada na criança"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Vacina</Label>
              <Controller
                name="susVaccineId"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select 
                    value={field.value} 
                    onValueChange={(val) => {
                      field.onChange(val);
                      const vaccine = susVaccines?.find(v => v.id === parseInt(val));
                      setSelectedVaccine(vaccine || null);
                    }}
                  >
                    <SelectTrigger data-testid="select-vaccine">
                      <SelectValue placeholder="Selecione a vacina" />
                    </SelectTrigger>
                    <SelectContent>
                      {susVaccines?.map(vaccine => (
                        <SelectItem key={vaccine.id} value={String(vaccine.id)}>
                          {vaccine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedVaccine && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  <p className="font-medium">Previne: {selectedVaccine.diseasesPrevented}</p>
                  <p>Idade: {selectedVaccine.ageRange}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Dose</Label>
              <Controller
                name="dose"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-dose">
                      <SelectValue placeholder="Selecione a dose" />
                    </SelectTrigger>
                    <SelectContent>
                      {doseOptions.map(dose => (
                        <SelectItem key={dose} value={dose}>{dose}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Aplicação</Label>
              <Input 
                type="date" 
                {...form.register("applicationDate", { required: true })} 
                data-testid="input-application-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Local de Aplicação (opcional)</Label>
              <Input 
                placeholder="Ex: UBS Centro, Hospital Municipal..." 
                {...form.register("applicationPlace")}
                data-testid="input-application-place"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea 
                placeholder="Reações, lote, profissional..." 
                {...form.register("notes")}
                data-testid="input-vaccine-notes"
              />
            </div>

            <div className="space-y-2">
              <Label>Fotos do comprovante (opcional)</Label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                data-testid="input-vaccine-photo"
              />
              
              {photoUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photoUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Foto ${index + 1}`} 
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-add-photo"
              >
                <Camera className="w-4 h-4 mr-2" />
                Adicionar foto
              </Button>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isPending}
              data-testid="button-save-vaccine"
            >
              {isPending ? "Salvando..." : formMode === "edit" ? "Salvar Alterações" : "Registrar Vacina"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailRecord} onOpenChange={(isOpen) => !isOpen && setDetailRecord(null)}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          {detailRecord && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-green-600" />
                  {getVaccineName(detailRecord.susVaccineId)}
                </DialogTitle>
                <DialogDescription>Detalhes do registro vacinal</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{detailRecord.dose}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Aplicada em {format(new Date(detailRecord.applicationDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>

                  {detailRecord.applicationPlace && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{detailRecord.applicationPlace}</span>
                    </div>
                  )}

                  {detailRecord.notes && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4 mt-0.5" />
                      <span>{detailRecord.notes}</span>
                    </div>
                  )}
                </div>

                {detailRecord.photoUrls && detailRecord.photoUrls.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Image className="w-4 h-4" />
                      <span>Fotos do comprovante</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {detailRecord.photoUrls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={url} 
                            alt={`Comprovante ${index + 1}`} 
                            className="w-24 h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => openEditForm(detailRecord)}
                    data-testid="button-edit-vaccine"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => confirmDelete(detailRecord)}
                    data-testid="button-delete-vaccine"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de vacina? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteRecord.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 50 }}
              transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
              className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl p-8 mx-4 max-w-sm text-center shadow-2xl border-2 border-green-200"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Heart className="w-12 h-12 text-white fill-white" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
                
                <h2 className="font-display text-2xl font-bold text-green-700 mb-2">
                  Parabéns!
                </h2>
                
                <p className="text-green-600 font-medium mb-3">
                  {celebrationVaccine} registrada com sucesso!
                </p>

                <div className="bg-white/70 rounded-xl p-4 mb-4">
                  <p className="text-green-700 text-sm italic">
                    "{encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]}"
                  </p>
                </div>

                <p className="text-green-600 text-sm mb-4">
                  Você ganhou <span className="font-bold text-green-700">+15 pontos</span> por cuidar da saúde de {activeChild?.name}!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={() => setShowCelebration(false)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl py-3"
                  data-testid="button-close-celebration"
                >
                  Continuar
                </Button>
              </motion.div>

              <motion.div
                className="absolute -top-4 -left-4 text-4xl"
                animate={{ rotate: [0, 20, 0], y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0 }}
              >
                <Sparkles className="w-8 h-8 text-yellow-400" />
              </motion.div>
              <motion.div
                className="absolute -top-2 -right-4 text-3xl"
                animate={{ rotate: [0, -20, 0], y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
              >
                <Star className="w-7 h-7 text-yellow-400 fill-yellow-400" />
              </motion.div>
              <motion.div
                className="absolute -bottom-3 -right-2 text-3xl"
                animate={{ rotate: [0, 15, 0], y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}
              >
                <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
