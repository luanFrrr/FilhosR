import { useChildContext } from "@/hooks/use-child-context";
import {
  useDailyPhotosPaged,
  useCreateDailyPhoto,
  useTodayPhoto,
} from "@/hooks/use-daily-photos";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Check,
  ImagePlus,
  Loader2,
  Pause,
  Play,
  Share2,
  Square,
  StretchHorizontal,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { PhotoView } from "@/components/ui/photo-view";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { useUpload } from "@/hooks/use-upload";
import { getTransformedImageUrl } from "@/lib/imageUtils";
import { LazyImage } from "@/components/ui/lazy-image";
import type { DailyPhoto } from "@shared/schema";
import {
  buildRetrospectiveVideo,
  getRetrospectiveFrameDurationMs,
  isRetrospectiveVideoSupported,
} from "@/lib/retrospective-video";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

const MENSAGENS_MOMENTO = [
  "Esse momento não volta. Ainda bem que você guardou.",
  "Hoje ficou registrado para sempre.",
  "Um dia simples que virou memória.",
  "O crescimento acontece assim, um dia de cada vez.",
  "Mais um tijolinho na construção da história de vocês.",
  "O detalhe de hoje é o tesouro de amanhã.",
  "Capturar o agora é o melhor presente para o futuro.",
];

const MENSAGENS_SEQUENCIA = [
  "A constância do seu cuidado cria uma história linda.",
  "Um dia após o outro, construindo memórias eternas.",
  "Cada registro seguido é um ato de amor e presença.",
  "Você está documentando uma jornada incrível.",
];

const MENSAGENS_PRIMEIRA = [
  "O início de uma jornada linda de registros.",
  "A primeira de muitas memórias que virão.",
  "Começando hoje a guardar cada pedacinho do crescimento.",
];

const MENSAGENS_RETORNO = [
  "Que bom ter você de volta guardando esses momentos.",
  "O registro de hoje é um novo recomeço para as memórias.",
  "Cada dia é uma nova chance de eternizar o agora.",
];

const STORY_MAX_ITEMS = 30;
const STORY_FRAME_DURATION_MS = 3000;

export default function DailyPhotos() {
  const { activeChild } = useChildContext();
  const {
    data: pagedPhotos,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useDailyPhotosPaged(activeChild?.id || 0, 30);
  const { data: todayPhoto } = useTodayPhoto(activeChild?.id || 0);
  const createPhoto = useCreateDailyPhoto();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [isUploading, setIsUploading] = useState(false);
  const [showFeedback, setShowFeedback] = useState<{
    url: string;
    message: string;
  } | null>(null);
  const [isPreparingStory, setIsPreparingStory] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const [storyDisplayMode, setStoryDisplayMode] = useState<"contain" | "cover">(
    "contain",
  );
  const [isGeneratingShareClip, setIsGeneratingShareClip] = useState(false);
  const [shareClipProgress, setShareClipProgress] = useState(0);
  const [preparedShareClip, setPreparedShareClip] = useState<{
    file: File;
    childId: number;
    startPhotoId: number;
  } | null>(null);
  const [storyItems, setStoryItems] = useState<DailyPhoto[]>([]);
  const [storyCurrentPos, setStoryCurrentPos] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const { upload } = useUpload();
  const pendingPrependBaseCountRef = useRef<number | null>(null);
  const storyProgressRef = useRef(0);

  const photos = useMemo(
    () => pagedPhotos?.pages.flatMap((page) => page.data) || [],
    [pagedPhotos],
  );

  // Cronological order: oldest first, newest last (timeline style)
  const sortedPhotos =
    photos
      ?.slice()
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ) || [];

  const totalPhotos = sortedPhotos.length;
  const streakDays = calculateStreak(sortedPhotos.map((p) => p.date));
  const newestIndex = totalPhotos - 1; // Last item is the newest (chronological order)
  const shouldUseCarousel = totalPhotos >= 7;

  // Initialize to newest photo when photos load
  useEffect(() => {
    if (totalPhotos > 0 && currentIndex === -1) {
      setCurrentIndex(newestIndex);
    }
  }, [totalPhotos, currentIndex, newestIndex]);

  useEffect(() => {
    const previousCount = pendingPrependBaseCountRef.current;
    if (previousCount == null) return;

    if (photos.length > previousCount) {
      const addedCount = photos.length - previousCount;
      setCurrentIndex((prev) => (prev >= 0 ? prev + addedCount : prev));
    }

    pendingPrependBaseCountRef.current = null;
  }, [photos.length]);

  useEffect(() => {
    if (!carouselApi) return;
    const syncSelectedIndex = () => {
      setCurrentIndex(carouselApi.selectedScrollSnap());
    };

    syncSelectedIndex();
    carouselApi.on("select", syncSelectedIndex);
    carouselApi.on("reInit", syncSelectedIndex);

    return () => {
      carouselApi.off("select", syncSelectedIndex);
      carouselApi.off("reInit", syncSelectedIndex);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi || currentIndex < 0) return;
    if (carouselApi.selectedScrollSnap() !== currentIndex) {
      carouselApi.scrollTo(currentIndex);
    }
  }, [carouselApi, currentIndex]);

  useEffect(() => {
    if (!shouldUseCarousel) {
      setCarouselApi(undefined);
    }
  }, [shouldUseCarousel]);

  useEffect(() => {
    storyProgressRef.current = storyProgress;
  }, [storyProgress]);

  useEffect(() => {
    if (!preparedShareClip) return;
    const selectedPhoto = sortedPhotos[currentIndex];
    if (!selectedPhoto || !activeChild) {
      setPreparedShareClip(null);
      return;
    }
    const isSameContext =
      preparedShareClip.childId === activeChild.id &&
      preparedShareClip.startPhotoId === selectedPhoto.id;
    if (!isSameContext) {
      setPreparedShareClip(null);
    }
  }, [activeChild, currentIndex, preparedShareClip, sortedPhotos]);

  const getEmotionalMessage = useCallback(
    (currentStreak: number, hadRecentPhotos: boolean) => {
      const pickRandom = (arr: string[]) =>
        arr[Math.floor(Math.random() * arr.length)];

      if (totalPhotos === 0) {
        return pickRandom(MENSAGENS_PRIMEIRA);
      }

      if (currentStreak >= 2) {
        return pickRandom(MENSAGENS_SEQUENCIA);
      }

      if (!hadRecentPhotos && totalPhotos > 0) {
        return pickRandom(MENSAGENS_RETORNO);
      }

      return pickRandom(MENSAGENS_MOMENTO);
    },
    [totalPhotos],
  );

  const hadPhotoYesterday = useMemo(() => {
    if (sortedPhotos.length === 0) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    return sortedPhotos.some((p) => p.date === yesterdayStr);
  }, [sortedPhotos]);

  const handlePhotoSelected = useCallback(
    async (file: File) => {
      if (!activeChild) return;

      setIsUploading(true);

      try {
        // 1. Upload para o Supabase Storage
        const today = new Date().toISOString().split("T")[0];
        const photoUrl = await upload(file, {
          bucket: "daily-photos",
          path: `${activeChild.id}/${today}-${Date.now()}.jpg`,
          maxSize: 1200,
          quality: 0.8,
        });

        if (!photoUrl) throw new Error("Falha no upload da foto");

        // 2. Salva o registro no banco com a URL do Storage
        await createPhoto.mutateAsync({
          childId: activeChild.id,
          date: today,
          photoUrl,
        });

        const newStreak = hadPhotoYesterday ? streakDays + 1 : 1;
        const mensagem = getEmotionalMessage(newStreak, hadPhotoYesterday);

        setShowFeedback({ url: photoUrl, message: mensagem });
        setTimeout(() => setShowFeedback(null), 5000);

        setCurrentIndex(-1);
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível salvar a foto.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [
      activeChild,
      upload,
      createPhoto,
      toast,
      hadPhotoYesterday,
      streakDays,
      getEmotionalMessage,
    ],
  );

  const handleReplacePhoto = useCallback(
    async (file: File) => {
      if (!activeChild) return;

      setIsUploading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const photoUrl = await upload(file, {
          bucket: "daily-photos",
          path: `${activeChild.id}/${today}-${Date.now()}.jpg`,
          maxSize: 1200,
          quality: 0.8,
        });

        if (!photoUrl) throw new Error("Falha no upload da foto");

        await createPhoto.mutateAsync({
          childId: activeChild.id,
          date: today,
          photoUrl,
        });

        toast({
          title: "Foto trocada!",
          description: "A foto do dia foi atualizada.",
        });

        setCurrentIndex(-1);
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível trocar a foto.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [activeChild, upload, createPhoto, toast],
  );

  const goToPrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const goToNext = () => {
    if (currentIndex < totalPhotos - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    pendingPrependBaseCountRef.current = photos.length;
    await fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, photos.length, fetchNextPage]);

  const buildStoryQueue = useCallback(
    (allPhotos: DailyPhoto[], startPhotoId: number) => {
      const startIndex = allPhotos.findIndex(
        (photo) => photo.id === startPhotoId,
      );
      if (startIndex < 0) return [];

      // Stories tocam da foto selecionada para frente (mais recentes),
      // preservando a narrativa de crescimento no tempo.
      return allPhotos.slice(startIndex, startIndex + STORY_MAX_ITEMS);
    },
    [],
  );

  const closeStory = useCallback(() => {
    const currentStoryPhoto = storyItems[storyCurrentPos];
    if (currentStoryPhoto) {
      const indexInTimeline = sortedPhotos.findIndex(
        (photo) => photo.id === currentStoryPhoto.id,
      );
      if (indexInTimeline >= 0) {
        setCurrentIndex(indexInTimeline);
      }
    }

    setIsStoryOpen(false);
    setIsStoryPlaying(false);
    setStoryItems([]);
    setStoryCurrentPos(0);
    setStoryProgress(0);
    setStoryDisplayMode("contain");
  }, [storyItems, storyCurrentPos, sortedPhotos]);

  const openStoryFromIndex = useCallback(
    (startIndex: number) => {
      if (startIndex < 0 || startIndex >= totalPhotos || isPreparingStory) {
        return;
      }

      const selected = sortedPhotos[startIndex];
      if (!selected) return;

      setIsPreparingStory(true);
      const startPhotoId = selected.id;

      try {
        let queue = buildStoryQueue(sortedPhotos, startPhotoId);

        if (queue.length === 0) return;

        setStoryItems(queue.slice(0, STORY_MAX_ITEMS));
        setStoryCurrentPos(0);
        setStoryProgress(0);
        setIsStoryPlaying(true);
        setIsStoryOpen(true);
      } finally {
        setIsPreparingStory(false);
      }
    },
    [buildStoryQueue, isPreparingStory, sortedPhotos, totalPhotos],
  );

  const goStoryNext = useCallback(() => {
    setStoryProgress(0);
    if (storyCurrentPos >= storyItems.length - 1) {
      closeStory();
      return;
    }
    setStoryCurrentPos((prev) => prev + 1);
  }, [closeStory, storyCurrentPos, storyItems.length]);

  const goStoryPrevious = useCallback(() => {
    setStoryProgress(0);
    setStoryCurrentPos((prev) => Math.max(prev - 1, 0));
  }, []);

  const toggleStoryPlayback = useCallback(() => {
    setIsStoryPlaying((prev) => !prev);
  }, []);

  const toggleStoryDisplayMode = useCallback(() => {
    setStoryDisplayMode((prev) => (prev === "contain" ? "cover" : "contain"));
  }, []);

  const downloadRetrospectiveFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }, []);

  const isPreparedClipReady = useMemo(() => {
    if (!preparedShareClip || !activeChild) return false;
    const selectedPhoto = sortedPhotos[currentIndex];
    if (!selectedPhoto) return false;
    return (
      preparedShareClip.childId === activeChild.id &&
      preparedShareClip.startPhotoId === selectedPhoto.id
    );
  }, [activeChild, currentIndex, preparedShareClip, sortedPhotos]);

  const handleShareRetrospective = useCallback(async () => {
    if (!activeChild) return;
    if (totalPhotos < 7) return;
    if (currentIndex < 0 || currentIndex >= totalPhotos) return;

    const queue = sortedPhotos.slice(
      currentIndex,
      currentIndex + STORY_MAX_ITEMS,
    );
    if (queue.length < 7) {
      toast({
        title: "Selecione uma foto mais antiga",
        description:
          "Para compartilhar a retrospectiva, escolha um ponto com pelo menos 7 fotos em sequência.",
      });
      return;
    }

    const selectedPhoto = sortedPhotos[currentIndex];
    if (!selectedPhoto) return;

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };
    const canNativeShareFile = (file: File) => {
      if (typeof nav.share !== "function") return false;
      if (typeof nav.canShare !== "function") return true;
      try {
        return nav.canShare({ files: [file] });
      } catch {
        return false;
      }
    };

    if (isPreparedClipReady && preparedShareClip) {
      try {
        if (canNativeShareFile(preparedShareClip.file)) {
          await nav.share({
            title: `Retrospectiva de ${activeChild.name}`,
            text: `Retrospectiva com ${queue.length} fotos no app Filhos.`,
            files: [preparedShareClip.file],
          });
          toast({
            title: "Compartilhado",
            description: "Retrospectiva enviada com sucesso.",
          });
          return;
        }

        downloadRetrospectiveFile(preparedShareClip.file);
        toast({
          title: "Vídeo pronto",
          description:
            "O arquivo foi baixado. Você pode enviar pelo WhatsApp ou Instagram manualmente.",
        });
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        console.error("[retrospectiva] erro ao compartilhar:", error);
        downloadRetrospectiveFile(preparedShareClip.file);
        toast({
          title: "Vídeo baixado",
          description:
            "O compartilhamento direto não foi possível. O arquivo foi baixado para você enviar manualmente.",
        });
      }
      return;
    }

    if (!isRetrospectiveVideoSupported()) {
      toast({
        title: "Seu navegador não suporta vídeo",
        description:
          "Neste dispositivo, gere o vídeo em um navegador mais recente para compartilhar no WhatsApp ou Instagram.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingShareClip(true);
    setShareClipProgress(0);

    try {
      const frameDurationMs = getRetrospectiveFrameDurationMs(queue.length);
      const file = await buildRetrospectiveVideo({
        frames: queue.map((photo) => ({
          src: getTransformedImageUrl(photo.photoUrl, {
            width: 1200,
            resize: "contain",
            quality: 90,
          }),
        })),
        frameDurationMs,
        width: 1080,
        height: 1920,
        onProgress: setShareClipProgress,
      });

      setPreparedShareClip({
        file,
        childId: activeChild.id,
        startPhotoId: selectedPhoto.id,
      });

      if (canNativeShareFile(file)) {
        toast({
          title: "Vídeo pronto",
          description: "Agora toque em Compartilhar agora.",
        });
        return;
      }

      downloadRetrospectiveFile(file);
      toast({
        title: "Vídeo pronto",
        description:
          "O arquivo foi baixado. Você pode enviar pelo WhatsApp ou Instagram manualmente.",
      });
    } catch (error: any) {
      console.error("[retrospectiva] erro ao gerar/compartilhar:", error);
      if (error?.name === "AbortError") return;
      toast({
        title: "Erro ao gerar vídeo",
        description:
          error?.message ||
          "Não foi possível finalizar a retrospectiva agora. Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingShareClip(false);
      setShareClipProgress(0);
    }
  }, [
    activeChild,
    currentIndex,
    downloadRetrospectiveFile,
    isPreparedClipReady,
    preparedShareClip,
    sortedPhotos,
    toast,
    totalPhotos,
  ]);

  useEffect(() => {
    if (!isStoryOpen || !isStoryPlaying || storyItems.length === 0) return;

    const startedAt =
      performance.now() - storyProgressRef.current * STORY_FRAME_DURATION_MS;
    let rafId = 0;

    const step = (now: number) => {
      const nextProgress = Math.min(
        (now - startedAt) / STORY_FRAME_DURATION_MS,
        1,
      );
      setStoryProgress(nextProgress);

      if (nextProgress >= 1) {
        if (storyCurrentPos >= storyItems.length - 1) {
          closeStory();
        } else {
          setStoryCurrentPos((prev) => prev + 1);
          setStoryProgress(0);
        }
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    closeStory,
    isStoryOpen,
    isStoryPlaying,
    storyCurrentPos,
    storyItems.length,
  ]);

  useEffect(() => {
    if (!isStoryOpen) return;
    const nextPhoto = storyItems[storyCurrentPos + 1];
    if (!nextPhoto) return;

    const preload = new Image();
    preload.src = getTransformedImageUrl(nextPhoto.photoUrl, {
      width: 1200,
      resize: "cover",
    });
  }, [isStoryOpen, storyCurrentPos, storyItems]);

  const currentStoryPhoto = storyItems[storyCurrentPos] || null;

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum perfil encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6 space-y-10">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold">Foto do Dia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Um registro diário do crescimento
          </p>
        </div>

        {/* Today's Photo Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {todayPhoto ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-700">
                      Foto de hoje registrada!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Continue amanhã
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Registre o momento de hoje</p>
                    <p className="text-xs text-muted-foreground">
                      Cada dia é único
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {todayPhoto ? (
                <PhotoPicker onPhotoSelected={handleReplacePhoto}>
                  {(openPicker) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openPicker}
                      disabled={isUploading}
                      data-testid="button-replace-today-photo"
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      {isUploading ? "Trocando..." : "Trocar"}
                    </Button>
                  )}
                </PhotoPicker>
              ) : (
                <PhotoPicker onPhotoSelected={handlePhotoSelected}>
                  {(openPicker) => (
                    <Button
                      size="sm"
                      onClick={openPicker}
                      disabled={isUploading}
                      data-testid="button-add-today-photo"
                    >
                      <ImagePlus className="w-4 h-4 mr-1" />
                      {isUploading ? "Salvando..." : "Adicionar"}
                    </Button>
                  )}
                </PhotoPicker>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{totalPhotos}</p>
            <p className="text-xs text-muted-foreground">fotos registradas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{streakDays}</p>
            <p className="text-xs text-muted-foreground">dias seguidos</p>
          </Card>
        </div>

        {/* Photo Gallery */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : totalPhotos === 0 || currentIndex < 0 ? (
          <Card className="p-8 text-center">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhuma foto ainda. Comece hoje!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {shouldUseCarousel ? (
              <div className="space-y-4">
                <Carousel
                  setApi={setCarouselApi}
                  opts={{ align: "start", loop: false }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-0">
                    {sortedPhotos.map((photo, index) => (
                      <CarouselItem key={photo.id} className="pl-0">
                        <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                          <PhotoView
                            src={photo.photoUrl}
                            alt={`Foto do dia ${format(parseISO(photo.date), "d 'de' MMMM", { locale: ptBR })}`}
                          >
                            <img
                              src={photo.photoUrl}
                              alt=""
                              className="w-full h-full object-cover cursor-pointer"
                              data-testid={`img-daily-photo-${index}`}
                            />
                          </PhotoView>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {totalPhotos > 1 && (
                    <>
                      <CarouselPrevious
                        className="left-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 backdrop-blur border-border/60 hover:bg-background"
                        data-testid="button-photo-prev"
                      />
                      <CarouselNext
                        className="right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 backdrop-blur border-border/60 hover:bg-background"
                        data-testid="button-photo-next"
                      />
                    </>
                  )}
                </Carousel>

                <div className="flex items-center justify-center gap-1.5">
                  {sortedPhotos.map((photo, index) => (
                    <button
                      key={`dot-${photo.id}`}
                      onClick={() => setCurrentIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentIndex
                          ? "w-6 bg-primary"
                          : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55"
                      }`}
                      aria-label={`Ir para foto ${index + 1}`}
                      data-testid={`button-carousel-dot-${index}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Main Photo Viewer */}
                <div className="relative">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full"
                      >
                        <PhotoView
                          src={sortedPhotos[currentIndex]?.photoUrl}
                          alt={`Foto do dia ${format(parseISO(sortedPhotos[currentIndex]?.date), "d 'de' MMMM", { locale: ptBR })}`}
                        >
                          <img
                            src={sortedPhotos[currentIndex]?.photoUrl}
                            alt=""
                            className="w-full h-full object-cover cursor-pointer"
                            data-testid={`img-daily-photo-${currentIndex}`}
                          />
                        </PhotoView>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Navigation Arrows */}
                  {totalPhotos > 1 && (
                    <>
                      <button
                        onClick={goToPrevious}
                        disabled={currentIndex === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center disabled:opacity-30 transition-opacity"
                        data-testid="button-photo-prev"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={goToNext}
                        disabled={currentIndex === totalPhotos - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center disabled:opacity-30 transition-opacity"
                        data-testid="button-photo-next"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Photo Date */}
            <div className="text-center">
              <p className="font-semibold">
                {format(
                  parseISO(sortedPhotos[currentIndex]?.date),
                  "EEEE, d 'de' MMMM",
                  { locale: ptBR },
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} de {totalPhotos}
              </p>
            </div>

            {totalPhotos > 0 && (
              <div className="flex justify-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openStoryFromIndex(currentIndex)}
                  className="rounded-full px-5"
                  disabled={isPreparingStory}
                  data-testid="button-story-play"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isPreparingStory ? "Preparando..." : "Play Stories"}
                </Button>

                {totalPhotos >= 7 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleShareRetrospective}
                    disabled={isGeneratingShareClip}
                    className="rounded-full px-5"
                    data-testid="button-share-retrospective"
                  >
                    {isGeneratingShareClip ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando{" "}
                        {Math.max(1, Math.round(shareClipProgress * 100))}%
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        {isPreparedClipReady
                          ? "Compartilhar agora"
                          : "Gerar vídeo"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {totalPhotos >= 7 && (
              <p className="text-[11px] text-muted-foreground text-center px-2">
                Compartilha até 30 fotos em vídeo, com velocidade automática
                para WhatsApp e Instagram.
              </p>
            )}

            {/* Thumbnail Strip - Timeline style */}
            {totalPhotos > 1 && (
              <div className="relative">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  ← mais antigo · mais recente →
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {sortedPhotos.map((photo, index) => {
                    const isNewest = index === newestIndex;
                    const isSelected = index === currentIndex;
                    return (
                      <button
                        key={photo.id}
                        onClick={() => setCurrentIndex(index)}
                        className={`relative flex-shrink-0 rounded-lg overflow-visible transition-all ${
                          isNewest
                            ? "w-16 h-16 ring-2 ring-amber-500 ring-offset-2 shadow-lg"
                            : "w-14 h-14"
                        } ${
                          isSelected && !isNewest
                            ? "ring-2 ring-primary ring-offset-2"
                            : !isNewest
                              ? "opacity-60 hover:opacity-100"
                              : ""
                        }`}
                        data-testid={`button-thumbnail-${index}`}
                      >
                        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm group-hover:shadow-md transition-all w-full h-full">
                          <LazyImage
                            src={getTransformedImageUrl(photo.photoUrl, {
                              width: 400,
                              resize: "cover",
                            })}
                            alt={`Foto do dia ${new Date(photo.date).toLocaleDateString()}`}
                            className="w-full aspect-square"
                          />
                        </div>
                        {isNewest && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow">
                            ★
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {hasNextPage && (
              <div className="flex justify-center pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  data-testid="button-load-more-daily-photos"
                >
                  {isFetchingNextPage
                    ? "Carregando..."
                    : "Carregar fotos antigas"}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {isStoryOpen && currentStoryPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black"
          >
            <div className="absolute top-0 left-0 right-0 z-20 p-3 space-y-3">
              <div className="flex items-center gap-1">
                {storyItems.map((item, index) => {
                  const progress =
                    index < storyCurrentPos
                      ? 1
                      : index === storyCurrentPos
                        ? storyProgress
                        : 0;
                  return (
                    <div
                      key={`story-progress-${item.id}`}
                      className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden"
                    >
                      <div
                        className="h-full bg-white"
                        style={{
                          width: `${progress * 100}%`,
                          transition: "width 120ms linear",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-white">
                <button
                  onClick={toggleStoryPlayback}
                  className="w-9 h-9 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"
                  aria-label={
                    isStoryPlaying ? "Pausar stories" : "Reproduzir stories"
                  }
                  data-testid="button-story-pause-toggle"
                >
                  {isStoryPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>

                <p className="text-xs text-white/85">
                  {storyCurrentPos + 1} de {storyItems.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleStoryDisplayMode}
                    className="h-9 rounded-full px-3 bg-black/45 backdrop-blur flex items-center justify-center gap-1.5 text-[11px] font-medium"
                    aria-label={
                      storyDisplayMode === "contain"
                        ? "Trocar para preencher"
                        : "Trocar para ajustar"
                    }
                    data-testid="button-story-display-mode"
                  >
                    {storyDisplayMode === "contain" ? (
                      <>
                        <StretchHorizontal className="w-3.5 h-3.5" />
                        Ajustar
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        Preencher
                      </>
                    )}
                  </button>
                  <button
                    onClick={closeStory}
                    className="w-9 h-9 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"
                    aria-label="Fechar stories"
                    data-testid="button-story-close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={goStoryPrevious}
              className="absolute left-0 top-0 h-full w-1/3 z-10"
              aria-label="Story anterior"
              data-testid="button-story-prev"
            />
            <button
              onClick={goStoryNext}
              className="absolute right-0 top-0 h-full w-1/3 z-10"
              aria-label="Próximo story"
              data-testid="button-story-next"
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStoryPhoto.id}
                initial={{ opacity: 0, scale: 1.05, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -20 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <img
                  src={getTransformedImageUrl(currentStoryPhoto.photoUrl, {
                    width: 400,
                    resize: "cover",
                  })}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
                />
                <img
                  src={getTransformedImageUrl(currentStoryPhoto.photoUrl, {
                    width: 800,
                    resize: storyDisplayMode,
                  })}
                  alt=""
                  className={`absolute inset-0 w-full h-full ${
                    storyDisplayMode === "contain"
                      ? "object-contain"
                      : "object-cover"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
              </motion.div>
            </AnimatePresence>

            <div className="absolute left-0 right-0 bottom-7 z-20 text-center px-5">
              <p className="text-white text-base font-semibold">
                {format(parseISO(currentStoryPhoto.date), "EEEE, d 'de' MMMM", {
                  locale: ptBR,
                })}
              </p>
              <p className="text-xs text-white/75 mt-1">
                Reprodução automática com limite de 30 fotos
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 text-center"
          >
            <button
              onClick={() => setShowFeedback(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl mb-8"
            >
              <img
                src={showFeedback.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 max-w-xs"
            >
              <p className="text-xl md:text-2xl font-display font-bold text-white leading-relaxed">
                {showFeedback.message}
              </p>
              <div className="w-12 h-1 bg-primary mx-auto rounded-full" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sortedDates = [...dates].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = today;

  for (const dateStr of sortedDates) {
    const photoDate = parseISO(dateStr);
    photoDate.setHours(0, 0, 0, 0);

    const diff = differenceInDays(currentDate, photoDate);

    if (diff === 0 || diff === 1) {
      streak++;
      currentDate = photoDate;
    } else {
      break;
    }
  }

  return streak;
}
