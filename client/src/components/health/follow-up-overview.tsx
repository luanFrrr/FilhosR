import { useEffect, useMemo, useState } from "react";
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
  useUpdateHealthFollowUp,
  useUpdateNeonatalScreening,
} from "@/hooks/use-health-follow-ups";
import { cn, parseLocalDate } from "@/lib/utils";
import {
  DEVELOPMENT_AGE_BANDS,
  NEWBORN_SCREENINGS,
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
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useHealthFollowUps(childId);
  const createFollowUp = useCreateHealthFollowUp();
  const updateFollowUp = useUpdateHealthFollowUp();
  const deleteFollowUp = useDeleteHealthFollowUp();
  const updateScreening = useUpdateNeonatalScreening();
  const updateMilestone = useUpdateDevelopmentMilestone();
  const createExam = useCreateHealthExam();
  const deleteExam = useDeleteHealthExam();

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
  const [loadingExamFile, setLoadingExamFile] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

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
    setExamTitle("");
    setExamDate(new Date().toISOString().slice(0, 10));
    setExamNotes("");
    setExamFiles([]);
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

    if (editingFollowUp) {
      updateFollowUp.mutate(
        { id: editingFollowUp.id, ...payload },
        {
          onSuccess: () => {
            setFollowUpOpen(false);
            resetFollowUpForm();
            toast({ title: "Acompanhamento atualizado" });
          },
        },
      );
      return;
    }

    createFollowUp.mutate(payload, {
      onSuccess: () => {
        setFollowUpOpen(false);
        resetFollowUpForm();
        toast({ title: "Acompanhamento registrado" });
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

      createExam.mutate(
        {
          childId,
          followUpId: selectedFollowUp.id,
          title: examTitle.trim(),
          examDate,
          notes: examNotes.trim() || undefined,
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
    setExamDate(followUp.followUpDate);
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
        </div>
      </div>

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

        {developmentFollowUps.map((followUp) => {
          const ageBand = getAgeBandMeta(followUp);
          const isCurrent =
            ageBand &&
            currentAgeMonths >= Math.max(ageBand.targetMonths - 3, 0) &&
            currentAgeMonths <= ageBand.targetMonths + 3;

          return (
            <div
              key={followUp.id}
              className="rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-display font-bold">
                      {ageBand?.label || followUp.title}
                    </h4>
                    {isCurrent && (
                      <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                        Agora
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ageBand
                      ? `Faixa de referencia em torno de ${ageBand.targetMonths} meses`
                      : "Acompanhamento do desenvolvimento"}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <Baby className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {followUp.developmentMilestones.map((milestone) => {
                  const statusConfig =
                    developmentStatusConfig[milestone.status] ||
                    developmentStatusConfig.pending;
                  return (
                    <div
                      key={milestone.id}
                      className="rounded-2xl border border-border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {milestone.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-2 rounded-full px-3 py-1",
                              statusConfig.className,
                            )}
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full"
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
                            className="rounded-full"
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
                            className="rounded-full"
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
            </div>
          );
        })}
      </section>

      <section className="space-y-4">
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
            <DialogTitle>Anexar exame</DialogTitle>
            <DialogDescription>
              Vincule exames ao contexto do acompanhamento.
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
              disabled={createExam.isPending}
            >
              {createExam.isPending ? "Salvando..." : "Salvar exame"}
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
