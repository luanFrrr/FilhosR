import { useState, useEffect, useMemo } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import {
  useSusVaccines,
  useVaccineRecords,
  useCreateVaccineRecord,
  useUpdateVaccineRecord,
  useDeleteVaccineRecord,
} from "@/hooks/use-vaccines";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Syringe,
  Plus,
  Check,
  ChevronRight,
  Shield,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  FileText,
  Heart,
  Star,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useSearch } from "wouter";
import { cn, parseLocalDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getPendingDosesByVaccine } from "@/lib/vaccineCheck";
import type { SusVaccine, VaccineRecord } from "@shared/schema";

const encouragingMessages = [
  "Cada vacina é um abraço de proteção!",
  "Você está construindo o escudo de saúde do seu filho!",
  "Amor de mãe/pai é também cuidar da saúde!",
  "Que orgulho! Seu pequeno está mais protegido!",
  "Vacininha dada, coração de mãe/pai tranquilo!",
];

type FormMode = "create" | "edit";
type VaccineFormValues = {
  susVaccineId: string;
  dose: string;
  applicationDate: string;
  applicationPlace: string;
  notes: string;
};

function normalizeDoseLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getRecommendedDoseLabels(vaccine?: SusVaccine | null) {
  if (!vaccine?.recommendedDoses) return [];

  const cleaned = vaccine.recommendedDoses.replace(/\([^)]*\)/g, "");

  return Array.from(
    new Set(
      cleaned
        .split(/,|\+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => (/^\d+ª$/.test(part) ? `${part} dose` : part))
        .map((part) => part.replace(/\s+/g, " ")),
    ),
  );
}

function getFirstMissingRecommendedDose(
  recommendedDoses: string[],
  existingRecords: VaccineRecord[],
) {
  const existingDoseSet = new Set(
    existingRecords.map((record) => normalizeDoseLabel(record.dose)),
  );

  return (
    recommendedDoses.find(
      (doseLabel) => !existingDoseSet.has(normalizeDoseLabel(doseLabel)),
    ) ?? ""
  );
}

function getSuggestedExtraDoseLabel(
  recommendedDoses: string[],
  existingRecords: VaccineRecord[],
) {
  const numericDoses = [...recommendedDoses, ...existingRecords.map((record) => record.dose)]
    .map((label) => {
      const match = label.match(/(\d+)ª\s*dose/i);
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => value !== null);

  if (numericDoses.length > 0) {
    return `${Math.max(...numericDoses) + 1}ª dose`;
  }

  return "Dose extra";
}

export default function VaccineCard() {
  const { activeChild } = useChildContext();
  const { data: susVaccines, isLoading: loadingVaccines } = useSusVaccines();
  const { data: vaccineRecords } = useVaccineRecords(activeChild?.id || 0);
  const createRecord = useCreateVaccineRecord();
  const updateRecord = useUpdateVaccineRecord();
  const deleteRecord = useDeleteVaccineRecord();
  const { toast } = useToast();
  
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const idParam = searchParams.get("id");
  const [, setLocation] = useLocation();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingRecord, setEditingRecord] = useState<VaccineRecord | null>(
    null,
  );
  const [detailRecord, setDetailRecord] = useState<VaccineRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<VaccineRecord | null>(
    null,
  );
  const [selectedVaccine, setSelectedVaccine] = useState<SusVaccine | null>(
    null,
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationVaccine, setCelebrationVaccine] = useState<string>("");

  const form = useForm<VaccineFormValues>({
    defaultValues: {
      susVaccineId: "",
      dose: "",
      applicationDate: "",
      applicationPlace: "",
      notes: "",
    },
  });

  const [highlightRecordId, setHighlightRecordId] = useState<number | null>(null);

  useEffect(() => {
    if (idParam) {
      setHighlightRecordId(Number(idParam));
      setLocation(`/vaccines`, { replace: true });
    }
  }, [idParam, setLocation]);

  useEffect(() => {
    if (highlightRecordId && vaccineRecords) {
      const timeoutId = setTimeout(() => {
        const element = document.querySelector(`[data-testid="vaccine-card-${highlightRecordId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          
          element.classList.add("ring-2", "ring-primary", "transition-all", "duration-1000");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary");
            setHighlightRecordId(null);
          }, 4000);
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [highlightRecordId, vaccineRecords]);

  useEffect(() => {
    if (editingRecord && formMode === "edit") {
      form.reset({
        susVaccineId: String(editingRecord.susVaccineId),
        dose: editingRecord.dose,
        applicationDate: editingRecord.applicationDate || "",
        applicationPlace: editingRecord.applicationPlace || "",
        notes: editingRecord.notes || "",
      });
      const vaccine = susVaccines?.find(
        (v) => v.id === editingRecord.susVaccineId,
      );
      setSelectedVaccine(vaccine || null);
    }
  }, [editingRecord, formMode, susVaccines, form]);

  const resetCreateForm = (vaccine?: SusVaccine | null) => {
    const nextSelectedVaccine = vaccine ?? null;
    const recommendedDoses = getRecommendedDoseLabels(nextSelectedVaccine);
    const existingRecords = nextSelectedVaccine
      ? getRecordsForVaccine(nextSelectedVaccine.id)
      : [];

    form.reset({
      susVaccineId: nextSelectedVaccine ? String(nextSelectedVaccine.id) : "",
      dose: getFirstMissingRecommendedDose(recommendedDoses, existingRecords),
      applicationDate: "",
      applicationPlace: "",
      notes: "",
    });
    setSelectedVaccine(nextSelectedVaccine);
  };

  const handleSelectedVaccineChange = (vaccineId: string) => {
    const vaccine = susVaccines?.find((item) => item.id === Number(vaccineId)) ?? null;
    const recommendedDoses = getRecommendedDoseLabels(vaccine);
    const existingRecords = vaccine ? getRecordsForVaccine(vaccine.id) : [];

    form.setValue("susVaccineId", vaccineId);
    form.setValue(
      "dose",
      getFirstMissingRecommendedDose(recommendedDoses, existingRecords),
    );
    form.setValue("applicationDate", "");
    form.setValue("applicationPlace", "");
    form.setValue("notes", "");
    setSelectedVaccine(vaccine);
  };

  const openCreateForm = (vaccine?: SusVaccine | null) => {
    setFormMode("create");
    setEditingRecord(null);
    setDetailRecord(null);
    resetCreateForm(vaccine);
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

    deleteRecord.mutate(
      { id: recordToDelete.id, childId: activeChild.id },
      {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setRecordToDelete(null);
          setDetailRecord(null);
          toast({ title: "Registro excluído!" });
        },
        onError: () => {
          toast({ title: "Erro ao excluir", variant: "destructive" });
        },
      },
    );
  };

  const onSubmit = async (data: VaccineFormValues) => {
    if (!activeChild) return;

    try {
      const payload = {
        susVaccineId: parseInt(data.susVaccineId),
        dose: data.dose.trim(),
        applicationDate: data.applicationDate || null,
        applicationPlace: data.applicationPlace?.trim() || null,
        notes: data.notes?.trim() || null,
      };

      if (!payload.susVaccineId || !payload.dose) {
        toast({
          title: "Preencha a vacina e a dose",
          description: "Selecione a vacina e informe qual dose deseja registrar.",
          variant: "destructive",
        });
        return;
      }

      if (
        typeof payload.applicationDate === "string" &&
        payload.applicationDate.includes("T")
      ) {
        payload.applicationDate = payload.applicationDate.split("T")[0];
      }

      if (formMode === "edit" && editingRecord) {
        updateRecord.mutate(
          { id: editingRecord.id, childId: activeChild.id, ...payload },
          {
            onSuccess: () => {
              setFormOpen(false);
              form.reset();
              setSelectedVaccine(null);
              setEditingRecord(null);
              toast({ title: "Vacina atualizada!" });
            },
            onError: () =>
              toast({ title: "Erro ao atualizar", variant: "destructive" }),
          },
        );
      } else {
        const vaccineName = selectedVaccine?.name || "Vacina";
        await createRecord.mutateAsync({ childId: activeChild.id, ...payload });
        setFormOpen(false);
        form.reset();
        setSelectedVaccine(null);
        setCelebrationVaccine(vaccineName);
        setShowCelebration(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível concluir o registro.",
        variant: "destructive",
      });
    }
  };

  const isPending = createRecord.isPending || updateRecord.isPending;

  const childAgeMonths = activeChild?.birthDate
    ? differenceInMonths(new Date(), parseLocalDate(activeChild.birthDate))
    : 0;

  const pendingByVaccine = useMemo((): Map<
    number,
    {
      vaccineId: number;
      vaccineName: string;
      dose: string;
      expectedMonths: number;
    }[]
  > => {
    if (!susVaccines || !vaccineRecords || !activeChild?.birthDate)
      return new Map();
    return getPendingDosesByVaccine(
      susVaccines,
      vaccineRecords,
      childAgeMonths,
    );
  }, [susVaccines, vaccineRecords, childAgeMonths, activeChild?.birthDate]);

  const pendingCount = useMemo(() => {
    let count = 0;
    pendingByVaccine.forEach((doses) => (count += doses.length));
    return count;
  }, [pendingByVaccine]);

  function getVaccineName(susVaccineId: number) {
    return susVaccines?.find((v) => v.id === susVaccineId)?.name || "Vacina";
  }

  function getRecordsForVaccine(vaccineId: number) {
    return vaccineRecords?.filter((record) => record.susVaccineId === vaccineId) || [];
  }

  const selectedRecommendedDoses = useMemo(
    () => getRecommendedDoseLabels(selectedVaccine),
    [selectedVaccine],
  );

  const selectedVaccineRecords = useMemo(
    () => (selectedVaccine ? getRecordsForVaccine(selectedVaccine.id) : []),
    [selectedVaccine, vaccineRecords],
  );

  const selectedStandardDoseRecords = useMemo(
    () =>
      selectedRecommendedDoses.map((doseLabel) => ({
        doseLabel,
        record:
          selectedVaccineRecords.find(
            (record) => normalizeDoseLabel(record.dose) === normalizeDoseLabel(doseLabel),
          ) ?? null,
      })),
    [selectedRecommendedDoses, selectedVaccineRecords],
  );

  const selectedExtraDoseRecords = useMemo(() => {
    const recommendedSet = new Set(
      selectedRecommendedDoses.map((doseLabel) => normalizeDoseLabel(doseLabel)),
    );

    return selectedVaccineRecords.filter(
      (record) => !recommendedSet.has(normalizeDoseLabel(record.dose)),
    );
  }, [selectedRecommendedDoses, selectedVaccineRecords]);

  const suggestedExtraDose = useMemo(
    () => getSuggestedExtraDoseLabel(selectedRecommendedDoses, selectedVaccineRecords),
    [selectedRecommendedDoses, selectedVaccineRecords],
  );

  const watchedDose = form.watch("dose");

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Carteira Vacinal" showChildSelector={false} showBackButton />
        <div className="flex items-center justify-center p-6 text-center">
          <p className="text-muted-foreground">
            Selecione uma criança para ver a carteira vacinal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Carteira Vacinal" showChildSelector={false} showBackButton />

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">
                {activeChild.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {vaccineRecords?.length || 0} vacinas registradas
              </p>
            </div>
          </div>

          <Button
            size="icon"
            onClick={() => openCreateForm()}
            data-testid="button-add-vaccine"
          >
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
                  {pendingCount} vacina{pendingCount > 1 ? "s" : ""} pendente
                  {pendingCount > 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Confira abaixo as vacinas destacadas em amarelo que já
                  deveriam ter sido aplicadas para a idade de {childAgeMonths}{" "}
                  {childAgeMonths === 1 ? "mês" : "meses"}.
                </p>
              </div>
            </div>
          </div>
        )}

        {loadingVaccines ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando vacinas...
          </div>
        ) : (
          <div className="space-y-3">
            {susVaccines?.map((vaccine) => {
              const records = getRecordsForVaccine(vaccine.id);
              const hasRecords = records.length > 0;
              const pendingDoses = pendingByVaccine.get(vaccine.id) || [];
              const hasPendingDoses = pendingDoses.length > 0;

              return (
                <div
                  key={vaccine.id}
                  className={cn(
                    "bg-card rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md",
                    hasRecords && !hasPendingDoses
                      ? "border-green-500/30 bg-green-500/5"
                      : hasPendingDoses
                        ? "border-amber-500/40 bg-amber-500/10 shadow-sm"
                        : "border-border",
                  )}
                  data-testid={`vaccine-card-${vaccine.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCreateForm(vaccine)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCreateForm(vaccine);
                    }
                  }}
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
                        <h3
                          className={cn(
                            "font-bold",
                            hasPendingDoses
                              ? "text-amber-800"
                              : "text-foreground",
                          )}
                        >
                          {vaccine.name}
                        </h3>
                        {hasPendingDoses && (
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                            {pendingDoses.length} pendente
                            {pendingDoses.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {vaccine.diseasesPrevented}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Idade:</span>{" "}
                        {vaccine.ageRange}
                      </p>

                      {/* Show pending doses */}
                      {hasPendingDoses && (
                        <div className="mt-2 p-2 bg-amber-100/50 rounded-lg">
                          <p className="text-xs font-semibold text-amber-800 mb-1">
                            Doses pendentes:
                          </p>
                          {pendingDoses.map((dose, idx) => (
                            <p key={idx} className="text-xs text-amber-700">
                              {dose.dose} (prevista aos {dose.expectedMonths}{" "}
                              {dose.expectedMonths === 1 ? "mês" : "meses"})
                            </p>
                          ))}
                        </div>
                      )}

                      {hasRecords && (
                        <div className="mt-3 space-y-2">
                          {records.map((record) => (
                            <button
                              key={record.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetail(record);
                              }}
                              className="w-full flex items-center gap-2 text-sm bg-card rounded-lg p-2 border border-green-500/20 hover:bg-green-500/10 transition-colors text-left"
                              data-testid={`vaccine-record-${record.id}`}
                            >
                              <Syringe className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="font-medium">{record.dose}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-muted-foreground">
                                {record.applicationDate ? (
                                  format(
                                    parseLocalDate(record.applicationDate),
                                    "dd/MM/yyyy",
                                  )
                                ) : (
                                  <span className="text-amber-500 font-medium">
                                    Pendente
                                  </span>
                                )}
                              </span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                        Toque no card para registrar uma dose ou revisar essa vacina.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(!vaccineRecords || vaccineRecords.length === 0) &&
          !loadingVaccines && (
            <div className="text-center py-8 mt-4 bg-muted/30 rounded-xl">
              <Syringe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhuma vacina registrada ainda.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Toque em uma vacina da lista ou use o + para registrar a primeira dose.
              </p>
            </div>
          )}
      </main>

      <Dialog
        open={formOpen}
        onOpenChange={(isOpen) => {
          setFormOpen(isOpen);
          if (!isOpen) {
            form.reset();
            setSelectedVaccine(null);
            setEditingRecord(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" />
              {formMode === "edit" ? "Editar dose da vacina" : "Registrar / aplicar vacina"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "edit"
                ? "Atualize os dados desse registro vacinal."
                : "Selecione a vacina, use uma dose padrão ou digite uma dose extra."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Vacina</Label>
              <Controller
                name="susVaccineId"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    disabled={formMode === "edit"}
                    value={field.value}
                    onValueChange={handleSelectedVaccineChange}
                  >
                    <SelectTrigger data-testid="select-vaccine">
                      <SelectValue placeholder="Selecione a vacina" />
                    </SelectTrigger>
                    <SelectContent>
                      {susVaccines?.map((vaccine) => (
                        <SelectItem key={vaccine.id} value={String(vaccine.id)}>
                          {vaccine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedVaccine && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Previne: {selectedVaccine.diseasesPrevented}
                  </p>
                  <p>Idade: {selectedVaccine.ageRange}</p>
                </div>
              )}
            </div>

            {formMode === "create" && selectedVaccine && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Doses padrão</p>
                    <p className="text-xs text-muted-foreground">
                      Toque numa dose para preencher rápido. Se ela já existir, você pode editar.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => form.setValue("dose", suggestedExtraDose)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Dose extra
                  </Button>
                </div>

                <div className="space-y-2">
                  {selectedStandardDoseRecords.length > 0 ? (
                    selectedStandardDoseRecords.map(({ doseLabel, record }) => {
                      const isSelected =
                        normalizeDoseLabel(watchedDose || "") ===
                        normalizeDoseLabel(doseLabel);

                      if (record) {
                        return (
                          <button
                            key={doseLabel}
                            type="button"
                            onClick={() => openEditForm(record)}
                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left transition-colors hover:bg-emerald-100"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-emerald-900">
                                  {doseLabel}
                                </p>
                                <p className="text-xs text-emerald-700">
                                  {record.applicationDate
                                    ? `Aplicada em ${format(
                                        parseLocalDate(record.applicationDate),
                                        "dd/MM/yyyy",
                                      )}`
                                    : "Salva como pendente"}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-emerald-800">
                                Editar
                              </span>
                            </div>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={doseLabel}
                          type="button"
                          onClick={() => form.setValue("dose", doseLabel)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background hover:bg-muted/60",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {doseLabel}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Disponível para registrar
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-primary">
                              Usar
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Essa vacina não tem doses padrão cadastradas. Você pode registrar manualmente.
                    </p>
                  )}
                </div>

                {selectedExtraDoseRecords.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Doses extras já registradas
                    </p>
                    {selectedExtraDoseRecords.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => openEditForm(record)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {record.dose}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.applicationDate
                                ? `Aplicada em ${format(
                                    parseLocalDate(record.applicationDate),
                                    "dd/MM/yyyy",
                                  )}`
                                : "Salva como pendente"}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Editar
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Dose</Label>
              <Input
                placeholder={
                  selectedVaccine
                    ? `Ex: ${suggestedExtraDose}`
                    : "Ex: 1ª dose, Dose única ou Reforço"
                }
                {...form.register("dose", { required: true })}
                data-testid="input-dose"
              />
              <p className="text-xs text-muted-foreground">
                Use uma dose padrão acima ou digite manualmente uma extra, como `4ª dose`.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Data de Aplicação</Label>
              <Input
                type="date"
                {...form.register("applicationDate")}
                data-testid="input-application-date"
              />
              <p className="text-xs text-muted-foreground">
                Se deixar em branco, a dose será salva como pendente.
              </p>
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

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              data-testid="button-save-vaccine"
            >
              {isPending
                ? "Salvando..."
                : formMode === "edit"
                  ? "Salvar Alterações"
                  : "Salvar Dose"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!detailRecord}
        onOpenChange={(isOpen) => !isOpen && setDetailRecord(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          {detailRecord && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-green-600" />
                  {getVaccineName(detailRecord.susVaccineId)}
                </DialogTitle>
                <DialogDescription>
                  Detalhes do registro vacinal
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{detailRecord.dose}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {detailRecord.applicationDate ? (
                      <span>
                        Aplicada em{" "}
                        {format(
                          parseLocalDate(detailRecord.applicationDate),
                          "dd 'de' MMMM 'de' yyyy",
                          { locale: ptBR },
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium">
                        Dose pendente — ainda não aplicada
                      </span>
                    )}
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
              Tem certeza que deseja excluir este registro de vacina? Esta ação
              não pode ser desfeita.
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
                  {celebrationVaccine.includes("dose")
                    ? celebrationVaccine
                    : `${celebrationVaccine} registrada com sucesso!`}
                </p>

                <div className="bg-card/70 rounded-xl p-4 mb-4">
                  <p className="text-green-700 text-sm italic">
                    "
                    {
                      encouragingMessages[
                        Math.floor(Math.random() * encouragingMessages.length)
                      ]
                    }
                    "
                  </p>
                </div>

                <p className="text-green-600 text-sm mb-4">
                  Você ganhou{" "}
                  <span className="font-bold text-green-700">+15 pontos</span>{" "}
                  por cuidar da saúde de {activeChild?.name}!
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
