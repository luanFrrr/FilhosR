import { useState, useEffect } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import {
  useHealthRecords,
  useCreateHealthRecord,
  useUpdateHealthRecord,
  useDeleteHealthRecord,
} from "@/hooks/use-health";
import {
  useGrowthRecords,
  useCreateGrowthRecord,
  useUpdateGrowthRecord,
  useArchiveGrowthRecord,
} from "@/hooks/use-growth";
import { Header } from "@/components/layout/header";
import { GrowthChart } from "@/components/growth/growth-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/ui/decimal-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Syringe,
  Thermometer,
  Shield,
  ChevronRight,
  Pencil,
  Trash2,
  LineChart,
  Plus,
  Scale,
  Ruler,
  Archive,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useSearch } from "wouter";
import {
  cn,
  parseLocalDate,
  parseDecimalBR,
  formatDecimalBR,
} from "@/lib/utils";
import { useVaccineRecords } from "@/hooks/use-vaccines";
import type { HealthRecord, GrowthRecord } from "@shared/schema";

const growthSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  weight: z.string().optional(),
  height: z.string().optional(),
  headCircumference: z.string().optional(),
});

type GrowthForm = z.infer<typeof growthSchema>;

export default function Health() {
  const { activeChild } = useChildContext();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const tabParam = searchParams.get("tab") || "vaccines";
  const idParam = searchParams.get("id");
  const [, setLocation] = useLocation();
  const { data: sickRecords } = useHealthRecords(activeChild?.id || 0);
  const { data: vaccineRecords } = useVaccineRecords(activeChild?.id || 0);
  const { data: growthRecords } = useGrowthRecords(activeChild?.id || 0);
  const createSickRecord = useCreateHealthRecord();
  const updateSickRecord = useUpdateHealthRecord();
  const deleteSickRecord = useDeleteHealthRecord();
  const createGrowthRecord = useCreateGrowthRecord();
  const updateGrowthRecord = useUpdateGrowthRecord();
  const archiveGrowthRecord = useArchiveGrowthRecord();
  const { toast } = useToast();
  const [sickDialogOpen, setSickDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [growthOpen, setGrowthOpen] = useState(false);
  const [growthEditOpen, setGrowthEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedGrowth, setSelectedGrowth] = useState<GrowthRecord | null>(
    null,
  );
  const [activeChartTab, setActiveChartTab] = useState<"weight" | "height">(
    "weight",
  );
  const [highlightRecordId, setHighlightRecordId] = useState<number | null>(null);

  useEffect(() => {
    if (idParam) {
      setHighlightRecordId(Number(idParam));
      // Limpa os params para evitar trigger extra on reload
      setLocation(`/health?tab=${tabParam}`, { replace: true });
    }
  }, [idParam, tabParam, setLocation]);

  useEffect(() => {
    if (highlightRecordId && (growthRecords || sickRecords)) {
      // Pequeno timeout pro DOM renderizar a tab correta se for necessário
      const timeoutId = setTimeout(() => {
        let prefix = "health-record";
        if (tabParam === "growth") prefix = "growth-record";
        
        const element = document.querySelector(`[data-testid="${prefix}-${highlightRecordId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          
          element.classList.add("ring-2", "ring-primary", "bg-primary/5", "transition-all", "duration-1000");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "bg-primary/5");
            setHighlightRecordId(null);
          }, 3000);
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [highlightRecordId, growthRecords, sickRecords, tabParam]);

  const sickForm = useForm({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      symptoms: "",
      medication: "",
      notes: "",
    },
  });

  const growthForm = useForm<GrowthForm>({
    resolver: zodResolver(growthSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
    },
  });

  const growthEditForm = useForm<GrowthForm>({
    resolver: zodResolver(growthSchema),
    defaultValues: {
      date: "",
      weight: undefined,
      height: undefined,
      headCircumference: undefined,
    },
  });

  const onSickSubmit = (data: any) => {
    if (!activeChild) return;

    if (editingRecord) {
      updateSickRecord.mutate(
        {
          id: editingRecord.id,
          childId: activeChild.id,
          ...data,
          date: data.date.includes("T") ? data.date.split("T")[0] : data.date,
        },
        {
          onSuccess: () => {
            setSickDialogOpen(false);
            setEditingRecord(null);
            sickForm.reset();
            toast({ title: "Registro atualizado!" });
          },
        },
      );
    } else {
      createSickRecord.mutate(
        {
          childId: activeChild.id,
          ...data,
          date: data.date.includes("T") ? data.date.split("T")[0] : data.date,
        },
        {
          onSuccess: () => {
            setSickDialogOpen(false);
            sickForm.reset();
            toast({ title: "Registro salvo!" });
          },
        },
      );
    }
  };

  const handleEdit = (record: HealthRecord) => {
    setEditingRecord(record);
    sickForm.reset({
      date: record.date,
      symptoms: record.symptoms,
      medication: record.medication || "",
      notes: record.notes || "",
    });
    setSickDialogOpen(true);
  };

  const handleDelete = (record: HealthRecord) => {
    if (!activeChild) return;
    deleteSickRecord.mutate(
      { id: record.id, childId: activeChild.id },
      {
        onSuccess: () => {
          toast({ title: "Registro excluído!" });
        },
      },
    );
  };

  const handleDialogClose = (open: boolean) => {
    setSickDialogOpen(open);
    if (!open) {
      setEditingRecord(null);
      sickForm.reset({
        date: new Date().toISOString().split("T")[0],
        symptoms: "",
        medication: "",
        notes: "",
      });
    }
  };

  const onGrowthSubmit = (data: GrowthForm) => {
    if (!activeChild) return;
    const date = data.date.includes("T") ? data.date.split("T")[0] : data.date;
    const weight = parseDecimalBR(data.weight);
    const height = parseDecimalBR(data.height);
    const head = parseDecimalBR(data.headCircumference);

    createGrowthRecord.mutate(
      {
        childId: activeChild.id,
        date,
        weight: weight !== null ? weight.toString() : undefined,
        height: height !== null ? height.toString() : undefined,
        headCircumference: head !== null ? head.toString() : undefined,
      },
      {
        onSuccess: () => {
          setGrowthOpen(false);
          growthForm.reset();
          toast({
            title: "Registro salvo com sucesso!",
            className: "bg-green-500 text-white border-none",
          });
        },
        onError: () => {
          toast({ title: "Erro ao salvar", variant: "destructive" });
        },
      },
    );
  };

  const onGrowthEdit = (record: GrowthRecord) => {
    setSelectedGrowth(record);
    growthEditForm.reset({
      date: record.date,
      weight: record.weight ? formatDecimalBR(record.weight) : undefined,
      height: record.height ? formatDecimalBR(record.height, 1) : undefined,
      headCircumference: record.headCircumference
        ? formatDecimalBR(record.headCircumference, 1)
        : undefined,
    });
    setGrowthEditOpen(true);
  };

  const onGrowthEditSubmit = (data: GrowthForm) => {
    if (!activeChild || !selectedGrowth) return;
    const date = data.date.includes("T") ? data.date.split("T")[0] : data.date;
    const weight = parseDecimalBR(data.weight);
    const height = parseDecimalBR(data.height);
    const head = parseDecimalBR(data.headCircumference);

    updateGrowthRecord.mutate(
      {
        id: selectedGrowth.id,
        childId: activeChild.id,
        date,
        weight: weight !== null ? weight.toString() : undefined,
        height: height !== null ? height.toString() : undefined,
        headCircumference: head !== null ? head.toString() : undefined,
      },
      {
        onSuccess: () => {
          setGrowthEditOpen(false);
          setSelectedGrowth(null);
          toast({
            title: "Registro atualizado!",
            className: "bg-green-500 text-white border-none",
          });
        },
        onError: () => {
          toast({ title: "Erro ao atualizar", variant: "destructive" });
        },
      },
    );
  };

  const onGrowthArchive = (record: GrowthRecord) => {
    setSelectedGrowth(record);
    setArchiveOpen(true);
  };

  const confirmArchive = () => {
    if (!activeChild || !selectedGrowth) return;
    archiveGrowthRecord.mutate(
      {
        id: selectedGrowth.id,
        childId: activeChild.id,
      },
      {
        onSuccess: () => {
          setArchiveOpen(false);
          setSelectedGrowth(null);
          toast({
            title: "Registro arquivado",
            description: "O registro foi ocultado do histórico.",
            className: "bg-amber-500 text-white border-none",
          });
        },
        onError: () => {
          toast({ title: "Erro ao arquivar", variant: "destructive" });
        },
      },
    );
  };

  const weightData =
    growthRecords
      ?.filter((r) => r.weight)
      .map((r) => ({ date: r.date, value: Number(r.weight) })) || [];
  const heightData =
    growthRecords
      ?.filter((r) => r.height)
      .map((r) => ({ date: r.date, value: Number(r.height) })) || [];

  const visibleRecords = sickRecords;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Saúde" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6">
        <Tabs defaultValue={tabParam} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 h-auto rounded-xl">
            <TabsTrigger
              value="growth"
              className="py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold"
            >
              <LineChart className="w-4 h-4 mr-1" /> Crescimento
            </TabsTrigger>
            <TabsTrigger
              value="vaccines"
              className="py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold"
            >
              <Syringe className="w-4 h-4 mr-1" /> Vacinas
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold"
            >
              <Thermometer className="w-4 h-4 mr-1" /> Doenças
            </TabsTrigger>
          </TabsList>

          {/* ===== CRESCIMENTO TAB ===== */}
          <TabsContent value="growth" className="space-y-8">
            <div className="bg-muted/50 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setActiveChartTab("weight")}
                data-testid="tab-weight"
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  activeChartTab === "weight"
                    ? "bg-card shadow text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Scale className="w-4 h-4" /> Peso
              </button>
              <button
                onClick={() => setActiveChartTab("height")}
                data-testid="tab-height"
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  activeChartTab === "height"
                    ? "bg-card shadow text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Ruler className="w-4 h-4" /> Altura
              </button>
            </div>

            <div className="mobile-card">
              <div className="mb-6">
                <h2 className="text-lg font-display font-bold text-foreground">
                  {activeChartTab === "weight"
                    ? "Evolução do Peso"
                    : "Evolução da Altura"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Cada registro ajuda a acompanhar o desenvolvimento{" "}
                  {activeChild?.gender === "female" ? "dela" : "dele"}
                </p>
              </div>
              <GrowthChart
                data={activeChartTab === "weight" ? weightData : heightData}
                color={activeChartTab === "weight" ? "#3b82f6" : "#10b981"}
                unit={activeChartTab === "weight" ? "kg" : "cm"}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-lg">Histórico</h3>
                <Dialog open={growthOpen} onOpenChange={setGrowthOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      data-testid="button-new-record"
                      className="bg-primary text-white rounded-full px-4 gap-2 hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4" /> Novo Registro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Registrar Medidas</DialogTitle>
                      <DialogDescription>
                        Adicione as medidas de crescimento da criança.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={growthForm.handleSubmit(onGrowthSubmit)}
                      className="space-y-4 pt-4"
                    >
                      <div className="space-y-2">
                        <Label>Data</Label>
                        <Input
                          type="date"
                          {...growthForm.register("date")}
                          className="input-field"
                          data-testid="input-date"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Peso (kg)</Label>
                          <Controller
                            name="weight"
                            control={growthForm.control}
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
                            control={growthForm.control}
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
                        <Label>
                          Perímetro Cefálico (cm){" "}
                          <span className="text-muted-foreground text-xs">
                            (Opcional)
                          </span>
                        </Label>
                        <Controller
                          name="headCircumference"
                          control={growthForm.control}
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
                      <Button
                        type="submit"
                        data-testid="button-save-record"
                        className="w-full btn-primary"
                        disabled={createGrowthRecord.isPending}
                      >
                        {createGrowthRecord.isPending
                          ? "Salvando..."
                          : "Salvar Registro"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {growthRecords
                  ?.slice()
                  .sort((a, b) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    if (dateB !== dateA) return dateB - dateA;
                    return (
                      new Date(b.createdAt ?? 0).getTime() -
                      new Date(a.createdAt ?? 0).getTime()
                    );
                  })
                  .map((record) => (
                    <div
                      key={record.id}
                      data-testid={`growth-record-${record.id}`}
                      className="bg-card p-4 rounded-xl border border-border flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-foreground">
                          {format(
                            parseLocalDate(record.date),
                            "dd 'de' MMMM, yyyy",
                            { locale: ptBR },
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(parseLocalDate(record.date), {
                            locale: ptBR,
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {record.weight && (
                            <div className="text-sm">
                              <span className="font-bold text-blue-600">
                                {formatDecimalBR(record.weight)}kg
                              </span>
                            </div>
                          )}
                          {record.height && (
                            <div className="text-sm">
                              <span className="font-bold text-emerald-600">
                                {formatDecimalBR(record.height, 1)}cm
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onGrowthEdit(record)}
                            data-testid={`button-edit-${record.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onGrowthArchive(record)}
                            data-testid={`button-archive-${record.id}`}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                {(!growthRecords || growthRecords.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum registro ainda.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== VACINAS TAB ===== */}
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
              <h4 className="font-bold text-blue-900 text-sm mb-2">
                Calendário do SUS
              </h4>
              <p className="text-xs text-blue-700">
                Registre todas as vacinas do seu filho baseado no Programa
                Nacional de Imunizações (PNI). Anexe fotos da carteirinha para
                manter tudo organizado.
              </p>
            </div>
          </TabsContent>

          {/* ===== DOENÇAS TAB ===== */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold">Histórico de Doenças</h3>
              <Dialog open={sickDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-health-record">
                    + Registrar
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-sm mx-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRecord
                        ? "Editar Registro"
                        : "Registrar Sintoma/Doença"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRecord
                        ? "Edite as informações do registro"
                        : "Anote os sintomas e medicações"}
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={sickForm.handleSubmit(onSickSubmit)}
                    className="space-y-4 pt-2"
                  >
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input
                        type="date"
                        {...sickForm.register("date")}
                        data-testid="input-health-date"
                      />
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
                      disabled={
                        createSickRecord.isPending || updateSickRecord.isPending
                      }
                      data-testid="button-save-health"
                    >
                      {createSickRecord.isPending || updateSickRecord.isPending
                        ? "Salvando..."
                        : "Salvar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {visibleRecords
                ?.slice()
                .sort((a, b) => {
                  const dateDiff =
                    new Date(b.date).getTime() - new Date(a.date).getTime();
                  if (dateDiff !== 0) return dateDiff;
                  return (
                    new Date(b.createdAt ?? 0).getTime() -
                    new Date(a.createdAt ?? 0).getTime()
                  );
                })
                .map((record) => (
                  <div
                    key={record.id}
                    className="bg-card p-4 rounded-xl border border-border shadow-sm"
                    data-testid={`health-record-${record.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                          {format(
                            parseLocalDate(record.date),
                            "dd 'de' MMMM, yyyy",
                            { locale: ptBR },
                          )}
                        </span>
                        <h4 className="font-display font-bold text-lg text-foreground">
                          {record.symptoms}
                        </h4>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                              className="h-8 w-8"
                              data-testid={`button-delete-health-${record.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-sm mx-auto">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Excluir registro?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O registro será
                                removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(record)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid={`button-confirm-delete-${record.id}`}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {record.medication && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                        <Syringe className="w-4 h-4" />
                        <span>{record.medication}</span>
                      </div>
                    )}
                    {record.notes && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {record.notes}
                      </p>
                    )}
                  </div>
                ))}
              {(!visibleRecords || visibleRecords.length === 0) && (
                <div className="text-center py-12 bg-card rounded-2xl border border-dashed">
                  <Thermometer className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Nenhum registro de doença.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Saúde de ferro!
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Growth Edit Dialog */}
      <Dialog open={growthEditOpen} onOpenChange={setGrowthEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>
              Altere os valores desejados e salve.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={growthEditForm.handleSubmit(onGrowthEditSubmit)}
            className="space-y-4 pt-4"
          >
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                {...growthEditForm.register("date")}
                className="input-field"
                data-testid="edit-input-date"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Controller
                  name="weight"
                  control={growthEditForm.control}
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
                  control={growthEditForm.control}
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
              <Label>
                Perímetro Cefálico (cm){" "}
                <span className="text-muted-foreground text-xs">
                  (Opcional)
                </span>
              </Label>
              <Controller
                name="headCircumference"
                control={growthEditForm.control}
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
            <Button
              type="submit"
              data-testid="button-update-record"
              className="w-full btn-primary"
              disabled={updateGrowthRecord.isPending}
            >
              {updateGrowthRecord.isPending
                ? "Salvando..."
                : "Atualizar Registro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Growth Archive Confirmation */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro será ocultado do histórico. Ele não será excluído
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-archive">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              data-testid="button-confirm-archive"
              className="bg-amber-600 hover:bg-amber-700"
            >
              {archiveGrowthRecord.isPending ? "Arquivando..." : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
