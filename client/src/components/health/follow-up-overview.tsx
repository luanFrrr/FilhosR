import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getHealthExamFileUrl,
  useCreateHealthExam,
  useCreateHealthFollowUp,
  useDeleteHealthExam,
  useDeleteHealthFollowUp,
  useHealthFollowUps,
  useUpdateDevelopmentMilestone,
  useUpdateHealthExam,
  useUpdateHealthFollowUp,
  useUpdateNeonatalScreening,
} from "@/hooks/use-health-follow-ups";
import { cn, parseLocalDate } from "@/lib/utils";
import {
  AGE_BASED_HEALTH_SUGGESTIONS,
  DEVELOPMENT_AGE_BANDS,
  NEWBORN_SCREENINGS,
  getClosestDevelopmentAgeBand,
  getAgeInMonthsFromDates,
} from "@shared/health-catalog";
import type {
  DevelopmentMilestone,
  HealthExam,
  HealthFollowUpWithRelations,
} from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Baby,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";

const followUpCategoryOptions = [
  { value: "routine", label: "Rotina" },
  { value: "consultation", label: "Consulta" },
  { value: "condition", label: "Doenca/Intercorrencia" },
] as const;

const developmentStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendente",
    className: "bg-muted text-muted-foreground border-border",
  },
  ok: {
    label: "Ok",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  attention: {
    label: "Atencao",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  delayed: {
    label: "Atraso",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

function followUpCategoryLabel(category: string) {
  switch (category) {
    case "routine":
      return "Rotina";
    case "consultation":
      return "Consulta";
    case "condition":
      return "Doenca";
    case "development":
      return "Desenvolvimento";
    case "neonatal":
      return "Triagem";
    default:
      return "Acompanhamento";
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileName(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function getAgeBandMeta(followUp: HealthFollowUpWithRelations) {
  const ageBandKey =
    followUp.developmentMilestones[0]?.ageBand ||
    followUp.sourceType?.replace("system_development_", "") ||
    "";
  return DEVELOPMENT_AGE_BANDS.find((band) => band.key === ageBandKey);
}

function getMilestoneSummary(milestones: DevelopmentMilestone[]) {
  const counts = milestones.reduce(
    (acc, milestone) => {
      acc[milestone.status] = (acc[milestone.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if ((counts.delayed || 0) > 0) return `${counts.delayed} com atraso`;
  if ((counts.attention || 0) > 0) return `${counts.attention} em atencao`;
  if ((counts.ok || 0) === milestones.length && milestones.length > 0) {
    return "Todos marcados como ok";
  }

  return `${counts.pending || 0} pendente(s)`;
}

export function FollowUpOverview({
  childId,
  birthDate,
  legacyRecordId,
  legacyTab,
}: {
  childId: number;
  birthDate: string;
  legacyRecordId?: number | null;
  legacyTab?: string | null;
}) {
  const { toast } = useToast();
  const [timelineStartDate, setTimelineStartDate] = useState<string | undefined>();
  const [timelineEndDate, setTimelineEndDate] = useState<string | undefined>();
  const [timelineCategoryFilter, setTimelineCategoryFilter] =
    useState<string>("all");
  const timelineQueryFilters = useMemo(
    () => ({
      startDate: timelineStartDate,
      endDate: timelineEndDate,
      category:
        timelineCategoryFilter === "all" ? undefined : timelineCategoryFilter,
    }),
    [timelineCategoryFilter, timelineEndDate, timelineStartDate],
  );
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useHealthFollowUps(childId, timelineQueryFilters);
  const createFollowUp = useCreateHealthFollowUp(timelineQueryFilters);
  const updateFollowUp = useUpdateHealthFollowUp(timelineQueryFilters);
  const deleteFollowUp = useDeleteHealthFollowUp(timelineQueryFilters);
  const updateScreening = useUpdateNeonatalScreening(timelineQueryFilters);
  const updateMilestone = useUpdateDevelopmentMilestone(timelineQueryFilters);
  const createExam = useCreateHealthExam(timelineQueryFilters);
  const updateExam = useUpdateHealthExam(timelineQueryFilters);
  const deleteExam = useDeleteHealthExam(timelineQueryFilters);

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] =
    useState<HealthFollowUpWithRelations | null>(null);
  const [editingFollowUp, setEditingFollowUp] =
    useState<HealthFollowUpWithRelations | null>(null);
  const [followUpCategory, setFollowUpCategory] = useState<string>("routine");
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDate, setFollowUpDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [examNotes, setExamNotes] = useState("");
  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [editingExam, setEditingExam] = useState<HealthExam | null>(null);
  const [removedExamFilePaths, setRemovedExamFilePaths] = useState<string[]>([]);
  const [loadingExamFile, setLoadingExamFile] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [openDevelopmentItem, setOpenDevelopmentItem] = useState<string>("");
  const didInitializeDevelopmentAccordion = useRef(false);
  const timelineSectionRef = useRef<HTMLElement | null>(null);
  const keepTimelineInViewRef = useRef(false);

  const followUps = useMemo(
    () => data?.pages.flatMap((page) => page.data) || [],
    [data],
  );

  const neonatalFollowUp = followUps.find((item) => item.category === "neonatal");
  const developmentFollowUps = followUps
    .filter((item) => item.category === "development")
    .sort(
      (a, b) =>
        new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime(),
    );
  const timelineFollowUps = followUps.filter(
    (item) => item.category !== "neonatal" && item.category !== "development",
  );

  const currentAgeMonths = useMemo(
    () => getAgeInMonthsFromDates(birthDate),
    [birthDate],
  );
  const closestAgeBand = useMemo(
    () => getClosestDevelopmentAgeBand(currentAgeMonths),
    [currentAgeMonths],
  );
  const ageSuggestion =
    currentAgeMonths <= 1
      ? AGE_BASED_HEALTH_SUGGESTIONS.newborn
      : AGE_BASED_HEALTH_SUGGESTIONS[closestAgeBand.key];
  const pendingNeonatalCount =
    neonatalFollowUp?.neonatalScreenings.filter((item) => !item.isCompleted)
      .length ?? 0;

  useEffect(() => {
    if (developmentFollowUps.length === 0) return;

    const closestFollowUp =
      developmentFollowUps.find(
        (followUp) => getAgeBandMeta(followUp)?.key === closestAgeBand.key,
      ) || developmentFollowUps[0];

    setOpenDevelopmentItem((current) => {
      if (!didInitializeDevelopmentAccordion.current) {
        didInitializeDevelopmentAccordion.current = true;
        return current || String(closestFollowUp.id);
      }

      if (
        current &&
        developmentFollowUps.some((followUp) => String(followUp.id) === current)
      ) {
        return current;
      }

      if (!current) {
        return current;
      }

      return String(closestFollowUp.id);
    });
  }, [closestAgeBand.key, developmentFollowUps]);

  useEffect(() => {
    if (!legacyRecordId || followUps.length === 0) return;

    let resolved = followUps.find((followUp) => followUp.id === legacyRecordId);
    if (!resolved && legacyTab === "history") {
      resolved = followUps.find(
        (followUp) =>
          followUp.sourceType === "health_record" &&
          followUp.sourceId === legacyRecordId,
      );
    }
    if (!resolved && legacyTab === "medical") {
      resolved = followUps.find(
        (followUp) =>
          followUp.sourceType === "medical_record" &&
          followUp.sourceId === legacyRecordId,
      );
    }

    if (resolved) setHighlightId(resolved.id);
  }, [legacyRecordId, legacyTab, followUps]);

  useEffect(() => {
    if (!highlightId) return;

    const timeoutId = setTimeout(() => {
      const element = document.querySelector(
        `[data-testid="follow-up-card-${highlightId}"]`,
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-primary", "bg-primary/5");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "bg-primary/5");
          setHighlightId(null);
        }, 3000);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [highlightId]);

  const resetFollowUpForm = () => {
    setEditingFollowUp(null);
    setFollowUpCategory("routine");
    setFollowUpTitle("");
    setFollowUpDate(new Date().toISOString().slice(0, 10));
    setFollowUpDescription("");
  };

  const resetExamForm = () => {
    setSelectedFollowUp(null);
    setEditingExam(null);
    setExamTitle("");
    setExamDate(new Date().toISOString().slice(0, 10));
    setExamNotes("");
    setExamFiles([]);
    setRemovedExamFilePaths([]);
  };

  const handleFollowUpSubmit = () => {
    if (!followUpTitle.trim()) return;

    const payload = {
      childId,
      category: followUpCategory,
      title: followUpTitle.trim(),
      description: followUpDescription.trim() || undefined,
      followUpDate,
    };
    const isEditing = Boolean(editingFollowUp);
    const editingId = editingFollowUp?.id;

    setFollowUpOpen(false);
    resetFollowUpForm();

    if (isEditing && editingId) {
      updateFollowUp.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Acompanhamento atualizado" });
          },
          onError: () => {
            toast({
              title: "Erro ao atualizar acompanhamento",
              variant: "destructive",
            });
          },
        },
      );
      return;
    }

    createFollowUp.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Acompanhamento registrado" });
      },
      onError: () => {
        toast({
          title: "Erro ao salvar acompanhamento",
          variant: "destructive",
        });
      },
    });
  };

  const handleExamSubmit = async () => {
    if (!selectedFollowUp || !examTitle.trim()) return;

    try {
      const files = await Promise.all(
        examFiles.map(async (file) => ({
          fileBase64: await fileToBase64(file),
          fileMimeType: file.type,
          fileName: file.name,
        })),
      );

      const payload = {
        childId,
        title: examTitle.trim(),
        examDate,
        notes: examNotes.trim() || undefined,
      };

      if (editingExam) {
        updateExam.mutate(
          {
            id: editingExam.id,
            ...payload,
            newFiles: files.length > 0 ? files : undefined,
            removeFilePaths:
              removedExamFilePaths.length > 0 ? removedExamFilePaths : undefined,
          },
          {
            onSuccess: () => {
              setExamOpen(false);
              resetExamForm();
              toast({ title: "Exame atualizado" });
            },
          },
        );
        return;
      }

      createExam.mutate(
        {
          ...payload,
          followUpId: selectedFollowUp.id,
          files: files.length > 0 ? files : undefined,
        },
        {
          onSuccess: () => {
            setExamOpen(false);
            resetExamForm();
            toast({ title: "Exame anexado" });
          },
        },
      );
    } catch {
      toast({ title: "Erro ao preparar arquivos", variant: "destructive" });
    }
  };

  const handleOpenExam = (followUp: HealthFollowUpWithRelations) => {
    setSelectedFollowUp(followUp);
    setEditingExam(null);
    setExamDate(followUp.followUpDate);
    setExamOpen(true);
  };

  const handleEditExam = (
    followUp: HealthFollowUpWithRelations,
    exam: HealthExam,
  ) => {
    setSelectedFollowUp(followUp);
    setEditingExam(exam);
    setExamTitle(exam.title);
    setExamDate(exam.examDate);
    setExamNotes(exam.notes || "");
    setExamFiles([]);
    setRemovedExamFilePaths([]);
    setExamOpen(true);
  };

  const handleEditFollowUp = (followUp: HealthFollowUpWithRelations) => {
    setEditingFollowUp(followUp);
    setFollowUpCategory(followUp.category);
    setFollowUpTitle(followUp.title);
    setFollowUpDate(followUp.followUpDate);
    setFollowUpDescription(followUp.description || "");
    setFollowUpOpen(true);
  };

  const handleDeleteFollowUp = (followUp: HealthFollowUpWithRelations) => {
    setSelectedFollowUp(followUp);
    setDeleteOpen(true);
  };

  const confirmDeleteFollowUp = () => {
    if (!selectedFollowUp) return;
    deleteFollowUp.mutate(
      { id: selectedFollowUp.id, childId },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          setSelectedFollowUp(null);
          toast({ title: "Acompanhamento excluido" });
        },
      },
    );
  };

  const toggleScreening = (
    followUpId: number,
    screeningType: string,
    checked: boolean,
  ) => {
    updateScreening.mutate({
      childId,
      followUpId,
      screeningType,
      isCompleted: checked,
      completedAt: checked ? new Date().toISOString().slice(0, 10) : null,
    });
  };

  const setMilestoneStatus = (
    followUpId: number,
    milestone: DevelopmentMilestone,
    status: "ok" | "attention" | "delayed",
  ) => {
    updateMilestone.mutate({
      childId,
      followUpId,
      milestoneKey: milestone.milestoneKey,
      status,
      checkedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const openExamFile = async (examId: number, index: number) => {
    const key = `${examId}-${index}`;
    setLoadingExamFile(key);
    try {
      const url = await getHealthExamFileUrl(examId, index);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Erro ao abrir arquivo", variant: "destructive" });
    } finally {
      setLoadingExamFile(null);
    }
  };

  const removeExam = (exam: HealthExam) => {
    deleteExam.mutate(
      { id: exam.id, childId },
      {
        onSuccess: () => toast({ title: "Exame removido" }),
      },
    );
  };

  useEffect(() => {
    if (!keepTimelineInViewRef.current || !timelineSectionRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      timelineSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      keepTimelineInViewRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    timelineCategoryFilter,
    timelineEndDate,
    timelineStartDate,
    timelineFollowUps.length,
  ]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Acompanhamento
            </p>
            <h2 className="mt-2 text-xl font-display font-bold text-foreground">
              Saude organizada em um fluxo so
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Triagem neonatal, marcos do desenvolvimento e historico clinico
              no mesmo lugar.
            </p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="rounded-full gap-2"
            onClick={() => {
              resetFollowUpForm();
              setFollowUpOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Novo acompanhamento
          </Button>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {timelineFollowUps.length} registros clinicos
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {developmentFollowUps.length} faixas de desenvolvimento
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Referencia atual: {closestAgeBand.label}
          </Badge>
        </div>
      </div>

      <section className="rounded-3xl border border-primary/15 bg-primary/5 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/70">
              Sugestao pela idade
            </p>
            <h3 className="mt-2 text-lg font-display font-bold text-foreground">
              {ageSuggestion.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {ageSuggestion.summary}
            </p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="rounded-full bg-background text-foreground hover:bg-background">
            {currentAgeMonths} meses
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Faixa mais proxima: {closestAgeBand.label}
          </Badge>
          {neonatalFollowUp && pendingNeonatalCount > 0 ? (
            <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
              {pendingNeonatalCount} triagem(ns) pendente(s)
            </Badge>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">
              Pontos de observacao desta fase
            </p>
            <div className="mt-3 space-y-2">
              {ageSuggestion.focusAreas.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-muted/40 px-3 py-2 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">
              Marcos esperados mais proximos
            </p>
            <div className="mt-3 space-y-2">
              {closestAgeBand.milestones.map((milestone) => (
                <div
                  key={milestone.key}
                  className="rounded-2xl bg-muted/40 px-3 py-2 text-sm text-foreground"
                >
                  {milestone.title}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 md:col-span-2">
            <p className="text-sm font-semibold text-foreground">
              Registros, exames e anexos que costumam aparecer
            </p>
            <div className="mt-3 space-y-2">
              {ageSuggestion.suggestedExams.map((suggestion) => (
                <div
                  key={suggestion}
                  className="rounded-2xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {neonatalFollowUp && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Ao nascer
              </p>
              <h3 className="mt-2 text-lg font-display font-bold">
                Triagem neonatal
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Checklist inicial inspirado na rotina real pediatrica.
              </p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {pendingNeonatalCount === 0
                ? "Triagem concluida"
                : `${pendingNeonatalCount} item(ns) pendente(s)`}
            </Badge>
            {currentAgeMonths <= 1 ? (
              <Badge className="rounded-full bg-sky-100 text-sky-700 hover:bg-sky-100">
                Prioridade da idade atual
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            {NEWBORN_SCREENINGS.map((screening) => {
              const record = neonatalFollowUp.neonatalScreenings.find(
                (item) => item.screeningType === screening.key,
              );
              return (
                <label
                  key={screening.key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={record?.isCompleted || false}
                      onCheckedChange={(checked) =>
                        toggleScreening(
                          neonatalFollowUp.id,
                          screening.key,
                          Boolean(checked),
                        )
                      }
                    />
                    <div>
                      <p className="font-medium text-foreground">{screening.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {record?.completedAt
                          ? `Realizado em ${format(parseLocalDate(record.completedAt), "dd/MM/yyyy")}`
                          : "Pendente"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full border",
                      record?.isCompleted
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {record?.isCompleted ? "Realizado" : "Pendente"}
                  </Badge>
                </label>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Eixo principal
            </p>
            <h3 className="mt-1 text-lg font-display font-bold">
              Marcos de desenvolvimento
            </h3>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {currentAgeMonths} meses
          </Badge>
        </div>

        <Accordion
          type="single"
          collapsible
          value={openDevelopmentItem}
          onValueChange={setOpenDevelopmentItem}
          className="space-y-2.5"
        >
          {developmentFollowUps.map((followUp) => {
            const ageBand = getAgeBandMeta(followUp);
            const isCurrent = ageBand?.key === closestAgeBand.key;

            return (
              <AccordionItem
                key={followUp.id}
                value={String(followUp.id)}
                className="overflow-hidden rounded-2xl border border-border bg-card px-4 shadow-sm"
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex w-full items-start justify-between gap-2.5 pr-2 text-left">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[15px] font-display font-bold text-foreground">
                          {ageBand?.label || followUp.title}
                        </h4>
                        {isCurrent ? (
                          <Badge className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/10">
                            Agora
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {ageBand
                          ? `Faixa de referencia em torno de ${ageBand.targetMonths} meses`
                          : "Acompanhamento do desenvolvimento"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getMilestoneSummary(followUp.developmentMilestones)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                      <Baby className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-0.5">
                  <div className="space-y-2.5">
                    {followUp.developmentMilestones.map((milestone) => {
                      const statusConfig =
                        developmentStatusConfig[milestone.status] ||
                        developmentStatusConfig.pending;
                      return (
                        <div
                          key={milestone.id}
                          className="rounded-xl border border-border p-3"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {milestone.title}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "mt-1.5 rounded-full px-2.5 py-0.5 text-[11px]",
                                  statusConfig.className,
                                )}
                              >
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() =>
                                  setMilestoneStatus(followUp.id, milestone, "ok")
                                }
                              >
                                Ok
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() =>
                                  setMilestoneStatus(
                                    followUp.id,
                                    milestone,
                                    "attention",
                                  )
                                }
                              >
                                Atencao
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() =>
                                  setMilestoneStatus(
                                    followUp.id,
                                    milestone,
                                    "delayed",
                                  )
                                }
                              >
                                Atraso
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>

      <section className="space-y-4" ref={timelineSectionRef}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Historico clinico
            </p>
            <h3 className="mt-1 text-lg font-display font-bold">
              Consultas, rotina e intercorrencias
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            startDate={timelineStartDate}
            endDate={timelineEndDate}
            onChange={(startDate, endDate) => {
              keepTimelineInViewRef.current = true;
              setTimelineStartDate(startDate);
              setTimelineEndDate(endDate);
            }}
          />
          <Select
            value={timelineCategoryFilter}
            onValueChange={(value) => {
              keepTimelineInViewRef.current = true;
              setTimelineCategoryFilter(value);
            }}
          >
            <SelectTrigger className="h-9 w-[220px] rounded-full">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="routine">Rotina</SelectItem>
              <SelectItem value="consultation">Consulta</SelectItem>
              <SelectItem value="condition">Doenca/Intercorrencia</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {timelineFollowUps.length} registro(s) no filtro atual
          </Badge>
        </div>

        {timelineFollowUps.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-muted-foreground">
              Nenhum acompanhamento registrado ainda.
            </p>
          </div>
        )}

        {timelineFollowUps.map((followUp) => (
          <div
            key={followUp.id}
            className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-colors"
            data-testid={`follow-up-card-${followUp.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {followUpCategoryLabel(followUp.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(parseLocalDate(followUp.followUpDate), "dd 'de' MMMM", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <h4 className="mt-3 text-lg font-display font-bold text-foreground">
                  {followUp.title}
                </h4>
                {followUp.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {followUp.description}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEditFollowUp(followUp)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteFollowUp(followUp)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Exames vinculados</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => handleOpenExam(followUp)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Anexar exame
                </Button>
              </div>

              {followUp.healthExams.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum exame anexado a este acompanhamento.
                </p>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                Arquivos ficam no storage e o banco guarda apenas os caminhos e
                metadados do anexo.
              </p>

              <div className="mt-3 space-y-3">
                {followUp.healthExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{exam.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {format(parseLocalDate(exam.examDate), "dd/MM/yyyy")}
                        </div>
                        {exam.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {exam.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditExam(followUp, exam)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeExam(exam)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {exam.filePaths && exam.filePaths.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {exam.filePaths.map((path, index) => (
                          <button
                            key={path}
                            type="button"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                            onClick={() => openExamFile(exam.id, index)}
                          >
                            {loadingExamFile === `${exam.id}-${index}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            <span className="truncate">{getFileName(path)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              className="gap-2 text-muted-foreground"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Carregar mais
            </Button>
          </div>
        )}
      </section>

      <Dialog
        open={followUpOpen}
        onOpenChange={(open) => {
          setFollowUpOpen(open);
          if (!open) resetFollowUpForm();
        }}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingFollowUp ? "Editar acompanhamento" : "Novo acompanhamento"}
            </DialogTitle>
            <DialogDescription>
              Registre consulta, rotina ou intercorrencia sem separar o fluxo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={followUpCategory} onValueChange={setFollowUpCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {followUpCategoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input
                value={followUpTitle}
                onChange={(event) => setFollowUpTitle(event.target.value)}
                placeholder="Ex: Consulta de puericultura"
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(event) => setFollowUpDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={followUpDescription}
                onChange={(event) => setFollowUpDescription(event.target.value)}
                className="min-h-[110px]"
                placeholder="Resumo do acompanhamento, conduta, orientacoes..."
              />
            </div>

            <Button
              className="w-full"
              onClick={handleFollowUpSubmit}
              disabled={createFollowUp.isPending || updateFollowUp.isPending}
            >
              {createFollowUp.isPending || updateFollowUp.isPending
                ? "Salvando..."
                : "Salvar acompanhamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={examOpen}
        onOpenChange={(open) => {
          setExamOpen(open);
          if (!open) resetExamForm();
        }}
      >
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExam ? "Editar exame" : "Anexar exame"}
            </DialogTitle>
            <DialogDescription>
              {editingExam
                ? "Atualize os dados e anexos vinculados a este exame."
                : "Vincule exames ao contexto do acompanhamento."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
              {selectedFollowUp?.title || "Selecione um acompanhamento"}
            </div>

            <div className="space-y-2">
              <Label>Titulo do exame</Label>
              <Input
                value={examTitle}
                onChange={(event) => setExamTitle(event.target.value)}
                placeholder="Ex: Hemograma completo"
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={examNotes}
                onChange={(event) => setExamNotes(event.target.value)}
                placeholder="Resultado, indicacao clinica ou anotacoes"
              />
            </div>

            <div className="space-y-3">
              <Label>Arquivos</Label>
              {editingExam?.filePaths
                ?.filter((path) => !removedExamFilePaths.includes(path))
                .map((path) => (
                  <div
                    key={path}
                    className="flex items-center justify-between rounded-2xl border border-border px-3 py-2"
                  >
                    <button
                      type="button"
                      className="truncate text-left text-sm text-primary hover:underline"
                      onClick={() => {
                        const fileIndex = Math.max(
                          editingExam.filePaths?.findIndex((item) => item === path) ?? 0,
                          0,
                        );
                        openExamFile(editingExam.id, fileIndex);
                      }}
                    >
                      {getFileName(path)}
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setRemovedExamFilePaths((current) => [...current, path])
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              {examFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-border px-3 py-2"
                >
                  <span className="truncate text-sm">{file.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setExamFiles((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <label className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/40">
                Selecionar PDF ou imagem
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const fileList = Array.from(event.target.files || []);
                    setExamFiles((current) => [...current, ...fileList]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            <Button
              className="w-full"
              onClick={handleExamSubmit}
              disabled={createExam.isPending || updateExam.isPending}
            >
              {createExam.isPending || updateExam.isPending
                ? "Salvando..."
                : editingExam
                  ? "Salvar alteracoes"
                  : "Salvar exame"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir acompanhamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao remove o acompanhamento e os exames vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFollowUp}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
