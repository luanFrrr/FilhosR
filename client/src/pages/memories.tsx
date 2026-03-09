import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { useChildContext } from "@/hooks/use-child-context";
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useDiary,
  useCreateDiaryEntry,
  useUpdateDiaryEntry,
  useDeleteDiaryEntry,
} from "@/hooks/use-memories";
import { useChildrenWithRoles } from "@/hooks/use-children";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import {
  Star,
  Book,
  Image as ImageIcon,
  Camera,
  X,
  Edit2,
  Trash2,
  Heart,
  Sparkles,
  MessageCircle,
  Lock,
  Globe,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { compressImage, getTransformedImageUrl } from "@/lib/imageUtils";
import { parseLocalDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PhotoPicker } from "@/components/ui/photo-picker";
import type { Milestone, DiaryEntry } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { LikeButton } from "@/components/social/LikeButton";
import { LazyImage } from "@/components/ui/lazy-image";
import { DiaryLikeButton } from "@/components/social/DiaryLikeButton";
import { MilestoneComments } from "@/components/social/MilestoneComments";
import { useMilestonesWithSocial } from "@/hooks/use-social";
import { useUpload } from "@/hooks/use-upload";
import { useRealtimeSocial } from "@/hooks/use-realtime-social";
import { useAuth } from "@/hooks/use-auth";

const celebrationMessages = [
  {
    title: "Que momento especial!",
    subtitle: "Cada conquista é um tesouro para guardar no coração",
  },
  {
    title: "Parabéns, papais!",
    subtitle: "Vocês estão construindo memórias lindas juntos",
  },
  {
    title: "Marco registrado!",
    subtitle: "Esse momento ficará eternizado para sempre",
  },
  {
    title: "Que orgulho!",
    subtitle: "Cada pequeno passo é uma grande vitória",
  },
  {
    title: "Momento mágico salvo!",
    subtitle: "O amor de vocês está em cada detalhe",
  },
  {
    title: "Conquista desbloqueada!",
    subtitle: "A jornada da maternidade/paternidade é incrível",
  },
  {
    title: "Lembranças preciosas!",
    subtitle: "Um dia vocês vão olhar para trás e sorrir",
  },
  {
    title: "Que emoção!",
    subtitle: "Esses momentos são o que fazem a vida valer a pena",
  },
  {
    title: "Eternizado com carinho!",
    subtitle: "Cada marco é uma estrela no céu de vocês",
  },
  {
    title: "Momento inesquecível!",
    subtitle: "O amor cresce a cada dia junto com seu pequeno",
  },
];

const empatheticMessages = [
  {
    title: "Estamos com você!",
    subtitle: "Nem todo dia é fácil, mas cada momento importa.",
  },
  {
    title: "Momento registrado",
    subtitle: "Até os dias difíceis merecem ser lembrados.",
  },
  {
    title: "Muito amor e paciência",
    subtitle: "Cuidar também é atravessar momentos intensos.",
  },
  {
    title: "Faz parte do caminho",
    subtitle: "Essa memória também faz parte da jornada.",
  },
];

const POSITIVE_EMOJIS = ["❤️", "😂"];
const SENSITIVE_EMOJIS = ["😮", "😢", "😡"];

export default function Memories() {
  const { user } = useAuth();
  const { activeChild } = useChildContext();
  const { data: milestones } = useMilestones(activeChild?.id || 0);
  const { data: milestonesWithSocial } = useMilestonesWithSocial(
    activeChild?.id || 0,
  );
  const {
    data: diaryPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDiary(activeChild?.id || 0);

  // Flatten diary pages into a single array for rendering
  const allDiaryEntries = diaryPages?.pages.flatMap((p) => p.data) || [];
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const createDiary = useCreateDiaryEntry();
  const updateDiary = useUpdateDiaryEntry();
  const deleteDiary = useDeleteDiaryEntry();
  const { data: childrenWithRoles } = useChildrenWithRoles();

  const canManageMilestone = (milestone: Milestone) => {
    const isAuthor = milestone.userId ? milestone.userId === user?.id : false;
    const roleInfo = childrenWithRoles?.find(
      (c: any) => c.id === activeChild?.id,
    );
    const isOwner = roleInfo?.role === "owner";
    if (milestone.isPrivate) return milestone.userId ? isAuthor : isOwner;
    return milestone.userId ? isAuthor || isOwner : isOwner;
  };

  const canManageDiary = (entry: DiaryEntry) => {
    const isAuthor = entry.userId ? entry.userId === user?.id : false;
    const roleInfo = childrenWithRoles?.find(
      (c: any) => c.id === activeChild?.id,
    );
    const isOwner = roleInfo?.role === "owner";
    if (entry.isPrivate) return entry.userId ? isAuthor : isOwner;
    return entry.userId ? isAuthor || isOwner : isOwner;
  };

  const { toast } = useToast();
  const [openMilestone, setOpenMilestone] = useState(false);
  const [openDiary, setOpenDiary] = useState(false);
  const [milestoneImage, setMilestoneImage] = useState<string | null>(null);
  const [viewMilestone, setViewMilestone] = useState<Milestone | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<Milestone | null>(null);
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null);
  const [deleteDiaryConfirm, setDeleteDiaryConfirm] =
    useState<DiaryEntry | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState({
    title: "",
    subtitle: "",
  });
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const tabParam = searchParams.get("tab") || "milestones";
  const idParam = searchParams.get("id");
  const commentIdParam = searchParams.get("commentId");

  const [activeTab, setActiveTab] = useState(tabParam);
  const [, setLocation] = useLocation();
  const deepLinkHandled = useRef<string | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<number | null>(
    null,
  );

  // Deep link: abre o marco específico quando vindo de uma notificação
  useEffect(() => {
    if (!idParam) return;
    if (deepLinkHandled.current === idParam) return;

    if (tabParam === "milestones" && milestones) {
      const target = milestones.find((m) => m.id === Number(idParam));
      if (target) {
        const parsedCommentId = Number(commentIdParam);
        const validCommentId =
          Number.isInteger(parsedCommentId) && parsedCommentId > 0
            ? parsedCommentId
            : null;
        deepLinkHandled.current = idParam;
        setHighlightCommentId(validCommentId);
        setViewMilestone(target);
        setLocation("/memories?tab=milestones", { replace: true });
      }
    }
    if (tabParam === "diary" && allDiaryEntries.length > 0) {
      deepLinkHandled.current = idParam;
      setHighlightCommentId(null);
      setLocation("/memories?tab=diary", { replace: true });
      setTimeout(() => {
        const el = document.querySelector(`[data-diary-id="${idParam}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(
            () =>
              el.classList.remove("ring-2", "ring-primary", "ring-offset-2"),
            3000,
          );
        }
      }, 300);
    }
  }, [idParam, tabParam, milestones, allDiaryEntries, commentIdParam]);

  const milestoneForm = useForm();
  const editForm = useForm();
  const diaryForm = useForm();
  const editDiaryForm = useForm();

  useEffect(() => {
    if (editingMilestone) {
      editForm.reset({
        date: editingMilestone.date,
        title: editingMilestone.title,
        description: editingMilestone.description || "",
        isPrivate: editingMilestone.isPrivate ?? false,
      });
      setMilestoneImage(editingMilestone.photoUrl || null);
    }
  }, [editingMilestone, editForm]);

  const { upload, isUploading: isUploadingPhoto } = useUpload();
  const [milestoneFile, setMilestoneFile] = useState<File | null>(null);

  // Realtime: atualiza likes e comentários de todos os cuidadores ao vivo
  useRealtimeSocial(activeChild?.id || 0);

  const handleImageFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "Imagem muito grande",
        description: "Escolha uma imagem menor que 15MB",
        variant: "destructive",
      });
      return;
    }
    setMilestoneFile(file);
    // Para preview local enquanto não salva
    const reader = new FileReader();
    reader.onloadend = () => setMilestoneImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const triggerCelebration = (moodEmoji?: string | null) => {
    const isSensitive = moodEmoji && SENSITIVE_EMOJIS.includes(moodEmoji);
    const pool = isSensitive ? empatheticMessages : celebrationMessages;

    const msg = pool[Math.floor(Math.random() * pool.length)];
    setCelebrationMsg(msg);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3500);
  };

  const onSubmitMilestone = async (data: any) => {
    if (!activeChild) return;
    if (createMilestone.isPending || isUploadingPhoto) return;

    let photoUrl = milestoneImage;

    if (milestoneFile) {
      const uploadedUrl = await upload(milestoneFile, {
        bucket: "milestone-photos",
        path: `${activeChild.id}/milestone-${Date.now()}.jpg`,
        maxSize: 1200,
        quality: 0.8,
      });
      if (uploadedUrl) photoUrl = uploadedUrl;
    }

    const date = data.date?.includes("T")
      ? data.date.split("T")[0]
      : data.date || new Date().toISOString().split("T")[0];

    try {
      await createMilestone.mutateAsync({
        childId: activeChild.id,
        ...data,
        date,
        photoUrl,
      });
      // Fecha o diálogo e reseta o formulário só após confirmar sucesso
      setOpenMilestone(false);
      milestoneForm.reset();
      setMilestoneImage(null);
      setMilestoneFile(null);
      triggerCelebration();
    } catch {
      toast({
        title: "Erro ao salvar marco",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const onSubmitEdit = async (data: any) => {
    if (!activeChild || !editingMilestone) return;
    if (updateMilestone.isPending || isUploadingPhoto) return;

    let photoUrl = milestoneImage;

    if (milestoneFile) {
      const uploadedUrl = await upload(milestoneFile, {
        bucket: "milestone-photos",
        path: `${activeChild.id}/milestone-${Date.now()}.jpg`,
        maxSize: 1200,
        quality: 0.8,
      });
      if (uploadedUrl) photoUrl = uploadedUrl;
    }

    const date = data.date?.includes("T")
      ? data.date.split("T")[0]
      : data.date || new Date().toISOString().split("T")[0];

    try {
      await updateMilestone.mutateAsync({
        childId: activeChild.id,
        milestoneId: editingMilestone.id,
        ...data,
        date,
        photoUrl,
        isPrivate: data.isPrivate ?? editingMilestone.isPrivate,
      });
      setEditingMilestone(null);
      editForm.reset();
      setMilestoneImage(null);
      setMilestoneFile(null);
      toast({ title: "Marco atualizado!" });
    } catch {
      toast({
        title: "Erro ao atualizar marco",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    if (!activeChild || !deleteConfirm) return;
    deleteMilestone.mutate(
      {
        childId: activeChild.id,
        milestoneId: deleteConfirm.id,
      },
      {
        onSuccess: () => {
          setDeleteConfirm(null);
          setViewMilestone(null);
          toast({ title: "Marco excluído" });
        },
      },
    );
  };

  useEffect(() => {
    if (editingDiary) {
      editDiaryForm.reset({
        date: editingDiary.date,
        content: editingDiary.content || "",
        moodEmoji: editingDiary.moodEmoji || "",
        isPrivate: editingDiary.isPrivate ?? false,
      });
    }
  }, [editingDiary, editDiaryForm]);

  const onSubmitDiary = (data: any) => {
    if (!activeChild) return;
    createDiary.mutate(
      { childId: activeChild.id, ...data, photoUrls: [] },
      {
        onSuccess: (record) => {
          setOpenDiary(false);
          diaryForm.reset();
          toast({
            title: "Diário salvo!",
            description: "Sua memória foi guardada com carinho.",
          });
          triggerCelebration(record.moodEmoji);
        },
        onError: () => {
          toast({
            title: "Erro ao salvar diário",
            description: "Tente novamente",
            variant: "destructive",
          });
        },
      },
    );
  };

  const onSubmitEditDiary = async (data: any) => {
    if (!activeChild || !editingDiary) return;
    try {
      await updateDiary.mutateAsync({
        childId: activeChild.id,
        entryId: editingDiary.id,
        ...data,
        isPrivate: data.isPrivate ?? editingDiary.isPrivate,
      });
      setEditingDiary(null);
      editDiaryForm.reset();
      toast({ title: "Registro atualizado!" });
    } catch {
      toast({
        title: "Erro ao atualizar diário",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDiary = () => {
    if (!activeChild || !deleteDiaryConfirm) return;
    deleteDiary.mutate(
      {
        childId: activeChild.id,
        entryId: deleteDiaryConfirm.id,
      },
      {
        onSuccess: () => {
          setDeleteDiaryConfirm(null);
          toast({ title: "Registro excluído" });
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Memórias" showChildSelector={false} />

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 p-8 rounded-3xl text-white text-center max-w-sm shadow-2xl"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="mb-4"
              >
                <Heart className="w-16 h-16 mx-auto fill-white" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
                <h2 className="text-2xl font-bold mb-2">
                  {celebrationMsg.title}
                </h2>
                <p className="text-white/90">{celebrationMsg.subtitle}</p>
                <div className="mt-4 text-sm bg-white/20 rounded-full px-4 py-2 inline-block">
                  +{activeTab === "milestones" ? 20 : 5} pontos de amor
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-md mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 h-auto rounded-xl">
            <TabsTrigger
              value="milestones"
              className="py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold"
            >
              <Star className="w-4 h-4 mr-2" /> Marcos
            </TabsTrigger>
            <TabsTrigger
              value="diary"
              className="py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold"
            >
              <Book className="w-4 h-4 mr-2" /> Diário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="milestones">
            <div className="bg-gradient-to-r from-primary/10 via-pink-500/10 to-purple-500/10 rounded-2xl p-4 mb-6 border border-primary/10">
              <p className="text-center text-sm text-muted-foreground italic font-hand">
                "Esses momentos passam rápido. Ainda bem que você guardou."
              </p>
            </div>

            <div className="mb-6 flex justify-end">
              <Dialog
                open={openMilestone}
                onOpenChange={(open) => {
                  setOpenMilestone(open);
                  if (!open) {
                    setMilestoneImage(null);
                    milestoneForm.reset();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="rounded-full"
                    data-testid="button-new-milestone"
                  >
                    <Heart className="w-4 h-4 mr-2" /> Guardar lembrança
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-sm mx-auto">
                  <DialogHeader>
                    <DialogTitle>Guardar uma lembrança</DialogTitle>
                    <DialogDescription>
                      Esse momento merece ser eternizado com carinho
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={milestoneForm.handleSubmit(onSubmitMilestone)}
                    className="space-y-4 pt-2"
                  >
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input
                        type="date"
                        {...milestoneForm.register("date")}
                        data-testid="input-milestone-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        placeholder="Ex: Primeiro sorriso"
                        {...milestoneForm.register("title")}
                        data-testid="input-milestone-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        placeholder="Como foi esse momento?"
                        {...milestoneForm.register("description")}
                        data-testid="input-milestone-description"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Foto do momento</Label>
                      {milestoneImage ? (
                        <div className="relative">
                          <img
                            src={milestoneImage}
                            alt="Preview"
                            className="w-full h-40 object-cover rounded-xl border border-border"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8 rounded-full"
                            onClick={() => setMilestoneImage(null)}
                            data-testid="button-remove-photo"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <PhotoPicker onPhotoSelected={handleImageFile}>
                          {(openPicker) => (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-24 border-dashed flex flex-col gap-2"
                              onClick={openPicker}
                              data-testid="button-upload-photo"
                            >
                              <Camera className="w-6 h-6 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Adicionar foto
                              </span>
                            </Button>
                          )}
                        </PhotoPicker>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2">
                        {milestoneForm.watch("isPrivate") ? (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Globe className="w-4 h-4 text-primary" />
                        )}
                        <div className="flex flex-col">
                          <Label className="text-sm font-semibold">
                            {milestoneForm.watch("isPrivate")
                              ? "Momento Privado"
                              : "Momento Público"}
                          </Label>
                          <span className="text-[10px] text-muted-foreground">
                            {milestoneForm.watch("isPrivate")
                              ? "Apenas você pode visualizar"
                              : "Visível para todos os cuidadores"}
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={milestoneForm.watch("isPrivate")}
                        onCheckedChange={(val) =>
                          milestoneForm.setValue("isPrivate", val)
                        }
                        data-testid="switch-milestone-private"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMilestone.isPending || isUploadingPhoto}
                      data-testid="button-save-milestone"
                    >
                      {isUploadingPhoto
                        ? "Enviando foto..."
                        : createMilestone.isPending
                          ? "Guardando..."
                          : "Guardar lembrança"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative border-l-2 border-primary/20 ml-4 space-y-8 pb-8">
              {milestones?.map((milestone) => {
                const social = milestonesWithSocial?.find(
                  (m) => m.id === milestone.id,
                );
                return (
                  <div
                    key={milestone.id}
                    className="relative pl-6 cursor-pointer group"
                    onClick={() => {
                      setHighlightCommentId(null);
                      setViewMilestone(milestone);
                    }}
                    data-testid={`milestone-item-${milestone.id}`}
                  >
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">
                      {format(
                        parseLocalDate(milestone.date),
                        "dd 'de' MMMM, yyyy",
                        { locale: ptBR },
                      )}
                    </span>
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm group-hover:shadow-md transition-shadow">
                      {/* Autor do marco */}
                      {social?.creatorName && (
                        <div className="flex items-center gap-2 mb-3">
                          <Avatar className="h-6 w-6">
                            {social.creatorAvatar ? (
                              <AvatarImage
                                src={social.creatorAvatar}
                                alt={social.creatorName}
                              />
                            ) : null}
                            <AvatarFallback className="text-[10px] font-semibold">
                              {social.creatorName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground">
                            {social.creatorName}
                          </span>
                        </div>
                      )}
                      {milestone.photoUrl && (
                        <LazyImage
                          src={getTransformedImageUrl(milestone.photoUrl, {
                            width: 400,
                            height: 320,
                            resize: "cover",
                          })}
                          alt={milestone.title}
                          className="w-full h-32 rounded-lg mb-3"
                        />
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display font-bold text-lg">
                          {milestone.title}
                        </h3>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted/50 rounded-full shrink-0">
                          {milestone.isPrivate ? (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <Globe className="w-3 h-3 text-primary" />
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {milestone.isPrivate ? "Privado" : "Público"}
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                        {milestone.description}
                      </p>
                      {/* Social counters */}
                      {social &&
                        (social.likeCount > 0 || social.commentCount > 0) && (
                          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                            {social.likeCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
                                {social.likeCount}
                              </span>
                            )}
                            {social.commentCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MessageCircle className="w-3 h-3" />
                                {social.commentCount}
                              </span>
                            )}
                          </div>
                        )}
                      {!(social?.likeCount || social?.commentCount) && (
                        <p className="text-xs text-primary mt-2">
                          Toque para ver detalhes
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!milestones || milestones.length === 0) && (
                <p className="pl-6 text-muted-foreground italic">
                  Registre os primeiros momentos especiais...
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="diary">
            <div className="mb-6 flex justify-end">
              <Dialog open={openDiary} onOpenChange={setOpenDiary}>
                <DialogTrigger asChild>
                  <Button
                    className="rounded-full"
                    data-testid="button-new-diary"
                  >
                    + Escrever
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-sm mx-auto">
                  <DialogHeader>
                    <DialogTitle>Querido Diário...</DialogTitle>
                    <DialogDescription>
                      Escreva sobre o dia de hoje
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={diaryForm.handleSubmit(onSubmitDiary)}
                    className="space-y-4 pt-2"
                  >
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input
                        type="date"
                        {...diaryForm.register("date")}
                        data-testid="input-diary-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Como você está se sentindo?</Label>
                      <div className="flex gap-4 justify-center py-2 bg-muted/30 rounded-xl">
                        {[...POSITIVE_EMOJIS, ...SENSITIVE_EMOJIS].map(
                          (emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                diaryForm.setValue("moodEmoji", emoji)
                              }
                              className={`text-2xl transition-all hover:scale-125 ${
                                diaryForm.watch("moodEmoji") === emoji
                                  ? "scale-125 grayscale-0"
                                  : "grayscale opacity-50"
                              }`}
                            >
                              {emoji}
                            </button>
                          ),
                        )}
                      </div>
                      <input
                        type="hidden"
                        {...diaryForm.register("moodEmoji")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>O que aconteceu hoje?</Label>
                      <Textarea
                        {...diaryForm.register("content")}
                        className="min-h-[120px]"
                        placeholder="Escreva algo memorável..."
                        data-testid="input-diary-content"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2">
                        {diaryForm.watch("isPrivate") ? (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Globe className="w-4 h-4 text-primary" />
                        )}
                        <div className="flex flex-col">
                          <Label className="text-sm font-semibold">
                            {diaryForm.watch("isPrivate")
                              ? "Registro Privado"
                              : "Registro Público"}
                          </Label>
                          <span className="text-[10px] text-muted-foreground">
                            {diaryForm.watch("isPrivate")
                              ? "Apenas você pode visualizar"
                              : "Visível para todos os cuidadores"}
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={diaryForm.watch("isPrivate")}
                        onCheckedChange={(val) =>
                          diaryForm.setValue("isPrivate", val)
                        }
                        data-testid="switch-diary-private"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createDiary.isPending}
                      data-testid="button-save-diary"
                    >
                      {createDiary.isPending
                        ? "Salvando..."
                        : "Salvar no Diário"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {allDiaryEntries?.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-card p-5 rounded-2xl border border-border shadow-sm transition-all duration-300"
                  data-diary-id={entry.id}
                  data-testid={`card-diary-${entry.id}`}
                >
                  {/* Autor da entrada */}
                  {(entry as any).creatorName && (
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6">
                        {(entry as any).creatorAvatar ? (
                          <AvatarImage
                            src={(entry as any).creatorAvatar}
                            alt={(entry as any).creatorName}
                          />
                        ) : null}
                        <AvatarFallback className="text-[10px] font-semibold">
                          {(entry as any).creatorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-muted-foreground">
                        {(entry as any).creatorName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-border">
                    <div className="flex flex-col gap-1">
                      <span className="font-hand text-lg font-bold text-primary flex items-center gap-2">
                        {format(parseLocalDate(entry.date), "dd/MM/yyyy")}
                        {entry.moodEmoji && (
                          <span className="text-xl">{entry.moodEmoji}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted/50 rounded-full w-fit">
                        {entry.isPrivate ? (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Globe className="w-3 h-3 text-primary" />
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {entry.isPrivate ? "Privado" : "Público"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {entry.photoUrls && entry.photoUrls.length > 0 && (
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                      {canManageDiary(entry as any) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingDiary(entry)}
                            data-testid={`button-edit-diary-${entry.id}`}
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteDiaryConfirm(entry)}
                            data-testid={`button-delete-diary-${entry.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-foreground leading-relaxed font-hand text-lg mb-3">
                    {entry.content}
                  </p>
                  <div className="flex items-center justify-start border-t border-border/30 pt-3">
                    <DiaryLikeButton
                      entryId={entry.id}
                      childId={activeChild?.id || 0}
                      initialCount={entry.likesCount}
                      initialLiked={(entry as any).userLiked}
                    />
                  </div>
                </div>
              ))}
              {allDiaryEntries.length === 0 && (
                <div className="text-center py-12">
                  <Book className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    O diário está em branco.
                  </p>
                </div>
              )}

              {hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    className="rounded-full px-8 py-6 font-semibold"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage
                      ? "Carregando..."
                      : "Carregar mais antigas"}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog
        open={!!viewMilestone}
        onOpenChange={(open) => {
          if (!open) {
            setViewMilestone(null);
            setHighlightCommentId(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          {viewMilestone &&
            (() => {
              const viewSocial = milestonesWithSocial?.find(
                (m) => m.id === viewMilestone.id,
              );
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      {viewMilestone.title}
                    </DialogTitle>
                    <DialogDescription>
                      {format(
                        parseLocalDate(viewMilestone.date),
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: ptBR },
                      )}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Autor do marco */}
                  {viewSocial?.creatorName && (
                    <div className="flex items-center gap-2.5 py-1">
                      <Avatar className="h-7 w-7">
                        {viewSocial.creatorAvatar ? (
                          <AvatarImage
                            src={viewSocial.creatorAvatar}
                            alt={viewSocial.creatorName}
                          />
                        ) : null}
                        <AvatarFallback className="text-[10px] font-semibold">
                          {viewSocial.creatorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-muted-foreground">
                        {viewSocial.creatorName}
                      </span>
                    </div>
                  )}

                  {viewMilestone.photoUrl && (
                    <LazyImage
                      src={viewMilestone.photoUrl}
                      alt={viewMilestone.title}
                      className="w-full h-64 rounded-xl max-h-64"
                    />
                  )}

                  <p className="text-foreground leading-relaxed">
                    {viewMilestone.description}
                  </p>

                  {/* Social: Like + Comments */}
                  <div className="border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <LikeButton
                        milestoneId={viewMilestone.id}
                        childId={activeChild?.id || 0}
                      />
                    </div>
                    <MilestoneComments
                      childId={activeChild?.id || 0}
                      milestoneId={viewMilestone.id}
                      highlightCommentId={highlightCommentId}
                    />
                  </div>

                  <DialogFooter className="flex gap-2 sm:gap-2">
                    {canManageMilestone(viewMilestone) && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingMilestone(viewMilestone);
                            setViewMilestone(null);
                          }}
                          data-testid="button-edit-milestone"
                        >
                          <Edit2 className="w-4 h-4 mr-2" /> Editar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setDeleteConfirm(viewMilestone)}
                          data-testid="button-delete-milestone"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingMilestone}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMilestone(null);
            setMilestoneImage(null);
            editForm.reset();
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Editar Marco</DialogTitle>
            <DialogDescription>
              Atualize as informações deste momento especial
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(onSubmitEdit)}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" {...editForm.register("date")} />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input {...editForm.register("title")} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea {...editForm.register("description")} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                {editForm.watch("isPrivate") ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Globe className="w-4 h-4 text-primary" />
                )}
                <div className="flex flex-col">
                  <Label className="text-sm font-semibold">
                    {editForm.watch("isPrivate")
                      ? "Momento Privado"
                      : "Momento Público"}
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {editForm.watch("isPrivate")
                      ? "Apenas você pode visualizar"
                      : "Visível para todos os cuidadores"}
                  </span>
                </div>
              </div>
              <Switch
                checked={editForm.watch("isPrivate")}
                onCheckedChange={(val) => editForm.setValue("isPrivate", val)}
              />
            </div>

            <div className="space-y-2">
              <Label>Foto do momento</Label>
              {milestoneImage ? (
                <div className="relative">
                  <img
                    src={milestoneImage}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-xl border border-border"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => setMilestoneImage(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <PhotoPicker onPhotoSelected={handleImageFile}>
                  {(openPicker) => (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-24 border-dashed flex flex-col gap-2"
                      onClick={openPicker}
                    >
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Adicionar foto
                      </span>
                    </Button>
                  )}
                </PhotoPicker>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateMilestone.isPending || isUploadingPhoto}
            >
              {isUploadingPhoto
                ? "Enviando foto..."
                : updateMilestone.isPending
                  ? "Salvando..."
                  : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Excluir Marco?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm?.title}"? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMilestone.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMilestone.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingDiary}
        onOpenChange={(open) => !open && setEditingDiary(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>Altere o conteúdo do diário</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editDiaryForm.handleSubmit(onSubmitEditDiary)}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                {...editDiaryForm.register("date")}
                data-testid="input-edit-diary-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Como você está se sentindo?</Label>
              <div className="flex gap-4 justify-center py-2 bg-muted/30 rounded-xl">
                {[...POSITIVE_EMOJIS, ...SENSITIVE_EMOJIS].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => editDiaryForm.setValue("moodEmoji", emoji)}
                    className={`text-2xl transition-all hover:scale-125 ${
                      editDiaryForm.watch("moodEmoji") === emoji
                        ? "scale-125 grayscale-0"
                        : "grayscale opacity-50"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input type="hidden" {...editDiaryForm.register("moodEmoji")} />
            </div>

            <div className="space-y-2">
              <Label>O que aconteceu?</Label>
              <Textarea
                {...editDiaryForm.register("content")}
                className="min-h-[120px]"
                data-testid="input-edit-diary-content"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                {editDiaryForm.watch("isPrivate") ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Globe className="w-4 h-4 text-primary" />
                )}
                <div className="flex flex-col">
                  <Label className="text-sm font-semibold">
                    {editDiaryForm.watch("isPrivate")
                      ? "Registro Privado"
                      : "Registro Público"}
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {editDiaryForm.watch("isPrivate")
                      ? "Apenas você pode visualizar"
                      : "Visível para todos os cuidadores"}
                  </span>
                </div>
              </div>
              <Switch
                checked={editDiaryForm.watch("isPrivate")}
                onCheckedChange={(val) =>
                  editDiaryForm.setValue("isPrivate", val)
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateDiary.isPending}
              data-testid="button-save-edit-diary"
            >
              {updateDiary.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteDiaryConfirm}
        onOpenChange={(open) => !open && setDeleteDiaryConfirm(null)}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro do diário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDiary}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-diary"
            >
              {deleteDiary.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
