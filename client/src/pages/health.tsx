import { useEffect, useState } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import {
  useGrowthRecords,
  useCreateGrowthRecord,
  useUpdateGrowthRecord,
  useArchiveGrowthRecord,
  useDeleteGrowthRecord,
} from "@/hooks/use-growth";
import { useVaccineRecords } from "@/hooks/use-vaccines";
import { Header } from "@/components/layout/header";
import { GrowthChart } from "@/components/growth/growth-chart";
import { FollowUpOverview } from "@/components/health/follow-up-overview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useSearch } from "wouter";
import {
  Archive,
  ChevronRight,
  LineChart,
  Pencil,
  Plus,
  Ruler,
  Scale,
  Shield,
  Stethoscope,
  Syringe,
  Trash2,
} from "lucide-react";
import { cn, formatDecimalBR, parseDecimalBR, parseLocalDate } from "@/lib/utils";
import type { GrowthRecord } from "@shared/schema";

const growthSchema = z.object({
  date: z.string().min(1, "Data e obrigatoria"),
  weight: z.string().optional(),
  height: z.string().optional(),
  headCircumference: z.string().optional(),
});

type GrowthForm = z.infer<typeof growthSchema>;

export default function Health() {
  const { activeChild } = useChildContext();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const rawTabParam = searchParams.get("tab");
  const tabParam =
    rawTabParam === "history" || rawTabParam === "medical"
      ? "follow-up"
      : rawTabParam || "follow-up";
  const idParam = searchParams.get("id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: vaccineRecords } = useVaccineRecords(activeChild?.id || 0);
  const { data: growthRecords } = useGrowthRecords(activeChild?.id || 0);
  const createGrowthRecord = useCreateGrowthRecord();
  const updateGrowthRecord = useUpdateGrowthRecord();
  const archiveGrowthRecord = useArchiveGrowthRecord();
  const deleteGrowthRecord = useDeleteGrowthRecord();

  const [growthOpen, setGrowthOpen] = useState(false);
  const [growthEditOpen, setGrowthEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteGrowthOpen, setDeleteGrowthOpen] = useState(false);
  const [selectedGrowth, setSelectedGrowth] = useState<GrowthRecord | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<"weight" | "height">(
    "weight",
  );
  const [highlightRecordId, setHighlightRecordId] = useState<number | null>(null);

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

  useEffect(() => {
    if (!idParam) return;
    setHighlightRecordId(Number(idParam));
    setLocation(`/health?tab=${tabParam}`, { replace: true });
  }, [idParam, setLocation, tabParam]);

  useEffect(() => {
    if (!highlightRecordId || tabParam !== "growth" || !growthRecords) return;

    const timeoutId = setTimeout(() => {
      const element = document.querySelector(
        `[data-testid="growth-record-${highlightRecordId}"]`,
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-primary", "bg-primary/5");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "bg-primary/5");
          setHighlightRecordId(null);
        }, 3000);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [growthRecords, highlightRecordId, tabParam]);

  const onGrowthSubmit = (data: GrowthForm) => {
    if (!activeChild) return;

    const weight = parseDecimalBR(data.weight);
    const height = parseDecimalBR(data.height);
    const head = parseDecimalBR(data.headCircumference);

    createGrowthRecord.mutate(
      {
        childId: activeChild.id,
        date: data.date,
        weight: weight !== null ? weight.toString() : undefined,
        height: height !== null ? height.toString() : undefined,
        headCircumference: head !== null ? head.toString() : undefined,
      },
      {
        onSuccess: () => {
          setGrowthOpen(false);
          growthForm.reset({ date: new Date().toISOString().split("T")[0] });
          toast({ title: "Registro salvo com sucesso!" });
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

    const weight = parseDecimalBR(data.weight);
    const height = parseDecimalBR(data.height);
    const head = parseDecimalBR(data.headCircumference);

    updateGrowthRecord.mutate(
      {
        id: selectedGrowth.id,
        childId: activeChild.id,
        date: data.date,
        weight: weight !== null ? weight.toString() : undefined,
        height: height !== null ? height.toString() : undefined,
        headCircumference: head !== null ? head.toString() : undefined,
      },
      {
        onSuccess: () => {
          setGrowthEditOpen(false);
          setSelectedGrowth(null);
          toast({ title: "Registro atualizado!" });
        },
        onError: () => {
          toast({ title: "Erro ao atualizar", variant: "destructive" });
        },
      },
    );
  };

  const confirmArchive = () => {
    if (!activeChild || !selectedGrowth) return;

    archiveGrowthRecord.mutate(
      { id: selectedGrowth.id, childId: activeChild.id },
      {
        onSuccess: () => {
          setArchiveOpen(false);
          setSelectedGrowth(null);
          toast({
            title: "Registro arquivado",
            description: "O registro foi ocultado do historico.",
          });
        },
        onError: () => {
          toast({ title: "Erro ao arquivar", variant: "destructive" });
        },
      },
    );
  };

  const confirmDeleteGrowth = () => {
    if (!activeChild || !selectedGrowth) return;

    deleteGrowthRecord.mutate(
      { id: selectedGrowth.id, childId: activeChild.id },
      {
        onSuccess: () => {
          setDeleteGrowthOpen(false);
          setSelectedGrowth(null);
          toast({
            title: "Registro excluido",
            description: "O registro foi removido do historico.",
          });
        },
        onError: () => {
          toast({ title: "Erro ao excluir", variant: "destructive" });
        },
      },
    );
  };

  const weightData =
    growthRecords
      ?.filter((record) => record.weight)
      .map((record) => ({ date: record.date, value: Number(record.weight) })) || [];

  const heightData =
    growthRecords
      ?.filter((record) => record.height)
      .map((record) => ({ date: record.date, value: Number(record.height) })) || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Saude" showChildSelector={false} />

      <main className="mx-auto max-w-md px-4 py-6">
        <Tabs
          value={tabParam}
          onValueChange={(value) => setLocation(`/health?tab=${value}`, { replace: true })}
          className="w-full"
        >
          <TabsList className="mb-8 grid h-auto w-full grid-cols-3 rounded-xl bg-muted/50 p-1">
            <TabsTrigger
              value="follow-up"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
            >
              <Stethoscope className="mr-1 h-4 w-4" /> Acompanhamento
            </TabsTrigger>
            <TabsTrigger
              value="growth"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
            >
              <LineChart className="mr-1 h-4 w-4" /> Crescimento
            </TabsTrigger>
            <TabsTrigger
              value="vaccines"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
            >
              <Syringe className="mr-1 h-4 w-4" /> Vacinas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="follow-up" className="space-y-4">
            {activeChild ? (
              <FollowUpOverview
                childId={activeChild.id}
                birthDate={activeChild.birthDate}
                legacyRecordId={highlightRecordId}
                legacyTab={rawTabParam}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="growth" className="space-y-8">
            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
              <button
                onClick={() => setActiveChartTab("weight")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  activeChartTab === "weight"
                    ? "bg-card text-primary shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Scale className="h-4 w-4" /> Peso
              </button>
              <button
                onClick={() => setActiveChartTab("height")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  activeChartTab === "height"
                    ? "bg-card text-primary shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Ruler className="h-4 w-4" /> Altura
              </button>
            </div>

            <div className="mobile-card">
              <div className="mb-6">
                <h2 className="text-lg font-display font-bold text-foreground">
                  {activeChartTab === "weight" ? "Evolucao do peso" : "Evolucao da altura"}
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
                birthDate={activeChild?.birthDate}
                gender={activeChild?.gender}
                metric={activeChartTab}
              />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-display font-bold">Historico</h3>
                <Dialog open={growthOpen} onOpenChange={setGrowthOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-full gap-2 px-4">
                      <Plus className="h-4 w-4" /> Novo registro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Registrar medidas</DialogTitle>
                      <DialogDescription>
                        Adicione peso, altura e perimetro cefalico.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={growthForm.handleSubmit(onGrowthSubmit)}
                      className="space-y-4 pt-4"
                    >
                      <div className="space-y-2">
                        <Label>Data</Label>
                        <Input type="date" {...growthForm.register("date")} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Peso (kg)</Label>
                          <Controller
                            name="weight"
                            control={growthForm.control}
                            render={({ field }) => (
                              <DecimalInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Ex: 12,5"
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
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Ex: 85,0"
                                decimalPlaces={1}
                              />
                            )}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Perimetro cefalico (cm)</Label>
                        <Controller
                          name="headCircumference"
                          control={growthForm.control}
                          render={({ field }) => (
                            <DecimalInput
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Ex: 35,5"
                              decimalPlaces={1}
                            />
                          )}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createGrowthRecord.isPending}
                      >
                        {createGrowthRecord.isPending ? "Salvando..." : "Salvar registro"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {growthRecords?.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm"
                    data-testid={`growth-record-${record.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {parseLocalDate(record.date).toLocaleDateString("pt-BR")}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-foreground">
                          {record.weight ? <div>Peso: {formatDecimalBR(record.weight)} kg</div> : null}
                          {record.height ? <div>Altura: {formatDecimalBR(record.height, 1)} cm</div> : null}
                          {record.headCircumference ? (
                            <div className="col-span-2">
                              PC: {formatDecimalBR(record.headCircumference, 1)} cm
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => onGrowthEdit(record)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedGrowth(record);
                            setArchiveOpen(true);
                          }}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedGrowth(record);
                            setDeleteGrowthOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {(!growthRecords || growthRecords.length === 0) && (
                  <div className="rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
                    Nenhum registro ainda.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vaccines" className="space-y-4">
            <Link href="/vaccines">
              <div className="cursor-pointer rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-5 text-white shadow-lg transition-transform active:scale-[0.98]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                      <Shield className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Carteira vacinal</h3>
                      <p className="text-sm text-white/80">
                        {vaccineRecords?.length || 0} vacinas registradas
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/70" />
                </div>
              </div>
            </Link>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={growthEditOpen} onOpenChange={setGrowthEditOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar registro</DialogTitle>
            <DialogDescription>Altere os valores desejados e salve.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={growthEditForm.handleSubmit(onGrowthEditSubmit)}
            className="space-y-4 pt-4"
          >
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" {...growthEditForm.register("date")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Controller
                  name="weight"
                  control={growthEditForm.control}
                  render={({ field }) => (
                    <DecimalInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Ex: 12,5"
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
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Ex: 85,0"
                      decimalPlaces={1}
                    />
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Perimetro cefalico (cm)</Label>
              <Controller
                name="headCircumference"
                control={growthEditForm.control}
                render={({ field }) => (
                  <DecimalInput
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Ex: 35,5"
                    decimalPlaces={1}
                  />
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={updateGrowthRecord.isPending}>
              {updateGrowthRecord.isPending ? "Salvando..." : "Atualizar registro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro sera ocultado do historico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {archiveGrowthRecord.isPending ? "Arquivando..." : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteGrowthOpen} onOpenChange={setDeleteGrowthOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove o registro de crescimento de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGrowth}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGrowthRecord.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
