import { useState } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import {
  useMedicalRecords,
  useCreateMedicalRecord,
  useUpdateMedicalRecord,
  useDeleteMedicalRecord,
  getMedicalFileUrl,
} from "@/hooks/use-medical-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Stethoscope,
  FileText,
  Paperclip,
  ExternalLink,
  Trash2,
  Pencil,
  Loader2,
  X,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn, parseLocalDate } from "@/lib/utils";
import type { MedicalRecord } from "@shared/schema";

function getFileName(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

export function MedicalTimeline() {
  const { activeChild } = useChildContext();
  const { toast } = useToast();

  const [filterStart, setFilterStart] = useState<string | undefined>();
  const [filterEnd, setFilterEnd] = useState<string | undefined>();

  const filters = filterStart || filterEnd
    ? { startDate: filterStart, endDate: filterEnd }
    : undefined;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMedicalRecords(activeChild?.id || 0, filters);

  const createRecord = useCreateMedicalRecord();
  const updateRecord = useUpdateMedicalRecord();
  const deleteRecord = useDeleteMedicalRecord();

  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const [formType, setFormType] = useState<string>("consulta");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [removeFilePaths, setRemoveFilePaths] = useState<string[]>([]);

  const resetForm = () => {
    setFormType("consulta");
    setFormTitle("");
    setFormDescription("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormFiles([]);
    setRemoveFilePaths([]);
    setEditingRecord(null);
  };

  const handleEdit = (record: MedicalRecord) => {
    setEditingRecord(record);
    setFormType(record.type);
    setFormTitle(record.title);
    setFormDescription(record.description || "");
    setFormDate(parseLocalDate(record.examDate).toISOString().split("T")[0]);
    setFormFiles([]);
    setRemoveFilePaths([]);
    setOpen(true);
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const newFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (!allowedTypes.includes(f.type)) {
        toast({ title: "Tipo não permitido", description: `${f.name}: use PDF ou imagens`, variant: "destructive" });
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${f.name}: máximo 10MB`, variant: "destructive" });
        continue;
      }
      newFiles.push(f);
    }
    setFormFiles((prev) => [...prev, ...newFiles]);
  };

  const removeNewFile = (index: number) => {
    setFormFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const markExistingForRemoval = (path: string) => {
    setRemoveFilePaths((prev) => [...prev, path]);
  };

  const undoRemoval = (path: string) => {
    setRemoveFilePaths((prev) => prev.filter((p) => p !== path));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild) return;

    const filesPayload = await Promise.all(
      formFiles.map(async (f) => ({
        fileBase64: await fileToBase64(f),
        fileMimeType: f.type,
        fileName: f.name,
      })),
    );

    if (editingRecord) {
      updateRecord.mutate(
        {
          id: editingRecord.id,
          childId: activeChild.id,
          type: formType,
          title: formTitle,
          description: formDescription || undefined,
          examDate: formDate,
          newFiles: filesPayload.length > 0 ? filesPayload : undefined,
          removeFilePaths: removeFilePaths.length > 0 ? removeFilePaths : undefined,
        },
        {
          onSuccess: () => {
            setOpen(false);
            resetForm();
            toast({ title: "Registro atualizado!", className: "bg-green-500 text-white border-none" });
          },
          onError: () => {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
          },
        },
      );
    } else {
      createRecord.mutate(
        {
          childId: activeChild.id,
          type: formType,
          title: formTitle,
          description: formDescription || undefined,
          examDate: formDate,
          files: filesPayload.length > 0 ? filesPayload : undefined,
        },
        {
          onSuccess: () => {
            setOpen(false);
            resetForm();
            toast({ title: "Registro salvo!", className: "bg-green-500 text-white border-none" });
          },
          onError: () => {
            toast({ title: "Erro ao salvar", variant: "destructive" });
          },
        },
      );
    }
  };

  const handleViewFile = async (recordId: number, fileIndex: number) => {
    const key = `${recordId}-${fileIndex}`;
    setLoadingFileId(key);
    try {
      const url = await getMedicalFileUrl(recordId, fileIndex);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Erro ao abrir arquivo", variant: "destructive" });
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleDelete = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!activeChild || !selectedRecord) return;
    deleteRecord.mutate(
      { id: selectedRecord.id, childId: activeChild.id },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          setSelectedRecord(null);
          toast({ title: "Registro excluído", className: "bg-amber-500 text-white border-none" });
        },
        onError: () => {
          toast({ title: "Erro ao excluir", variant: "destructive" });
        },
      },
    );
  };

  const records = data?.pages.flatMap((p) => p.data) || [];

  const groupedByMonth: Record<string, MedicalRecord[]> = {};
  records.forEach((r) => {
    const key = format(parseLocalDate(r.examDate), "MMMM yyyy", { locale: ptBR });
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(r);
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const existingPaths = editingRecord?.filePaths?.filter((p) => !removeFilePaths.includes(p)) || [];
  const removedPaths = editingRecord?.filePaths?.filter((p) => removeFilePaths.includes(p)) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-2">
        <h3 className="font-display font-bold text-lg">Consultas e Exames</h3>
        <div className="flex items-center gap-2">
          <DateRangeFilter
            startDate={filterStart}
            endDate={filterEnd}
            onChange={(s, e) => { setFilterStart(s); setFilterEnd(e); }}
          />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                data-testid="button-new-medical"
                className="bg-primary text-white rounded-full px-4 gap-2 hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRecord ? "Editar Registro" : "Novo Registro Médico"}</DialogTitle>
                <DialogDescription>
                  {editingRecord ? "Modifique as informações do registro." : "Registre uma consulta ou exame."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger data-testid="select-type" className="input-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consulta">Consulta</SelectItem>
                      <SelectItem value="exame">Exame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={formType === "consulta" ? "Ex: Pediatra - Dr. Silva" : "Ex: Hemograma completo"}
                    className="input-field"
                    data-testid="input-title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="input-field"
                    data-testid="input-exam-date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Descrição{" "}
                    <span className="text-muted-foreground text-xs">(Opcional)</span>
                  </Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Observações, diagnóstico, resultados..."
                    className="input-field min-h-[80px]"
                    data-testid="input-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Arquivos{" "}
                    <span className="text-muted-foreground text-xs">(PDF ou imagens, máx 10MB cada)</span>
                  </Label>

                  {existingPaths.map((path) => (
                    <div key={path} className="flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{getFileName(path)}</span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        data-testid={`button-remove-existing-${path}`}
                        onClick={() => markExistingForRemoval(path)}
                        title="Remover arquivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}

                  {removedPaths.map((path) => (
                    <div key={path} className="flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-destructive/30 bg-destructive/5">
                      <span className="text-sm text-muted-foreground line-through truncate">{getFileName(path)}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 shrink-0"
                        onClick={() => undoRemoval(path)}
                      >
                        Desfazer
                      </Button>
                    </div>
                  ))}

                  {formFiles.map((file, i) => (
                    <div key={`new-${i}`} className="flex items-center justify-between px-3 py-2 rounded-xl border border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(file.size / 1024 / 1024).toFixed(1)}MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeNewFile(i)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}

                  <label
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-muted hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Adicionar arquivo...
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      data-testid="input-file"
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <Button
                  type="submit"
                  data-testid="button-save-medical"
                  className="w-full btn-primary"
                  disabled={createRecord.isPending || updateRecord.isPending || !formTitle || !formDate}
                >
                  {createRecord.isPending || updateRecord.isPending ? "Salvando..." : "Salvar Registro"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {records.length === 0 && (
        <div className="text-center py-12">
          <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {filters
              ? "Nenhum registro encontrado nesse período."
              : "Nenhum registro ainda. Adicione consultas e exames para acompanhar o histórico médico."}
          </p>
        </div>
      )}

      {Object.entries(groupedByMonth).map(([monthLabel, monthRecords]) => (
        <div key={monthLabel}>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
            {monthLabel}
          </h4>
          <div className="relative pl-6 border-l-2 border-muted space-y-4">
            {monthRecords.map((record) => (
              <div key={record.id} className="relative" data-testid={`medical-record-${record.id}`}>
                <div
                  className={cn(
                    "absolute -left-[25px] top-3 w-3 h-3 rounded-full border-2 border-background",
                    record.type === "consulta" ? "bg-blue-500" : "bg-emerald-500",
                  )}
                />
                <div className="bg-card p-4 rounded-xl border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            record.type === "consulta"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                          )}
                        >
                          {record.type === "consulta" ? "Consulta" : "Exame"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseLocalDate(record.examDate), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <p className="font-bold text-foreground">{record.title}</p>
                      {record.description && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {record.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(record)}
                        data-testid={`button-edit-medical-${record.id}`}
                        title="Editar registro"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(record)}
                        data-testid={`button-delete-medical-${record.id}`}
                        title="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {record.filePaths && record.filePaths.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {record.filePaths.map((path, idx) => (
                        <button
                          key={path}
                          onClick={() => handleViewFile(record.id, idx)}
                          disabled={loadingFileId === `${record.id}-${idx}`}
                          data-testid={`button-view-file-${record.id}-${idx}`}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {loadingFileId === `${record.id}-${idx}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          <span className="truncate max-w-[200px]">{getFileName(path)}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            data-testid="button-load-more-medical"
            className="gap-2 text-muted-foreground"
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro será excluído permanentemente, incluindo os arquivos anexados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRecord.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
