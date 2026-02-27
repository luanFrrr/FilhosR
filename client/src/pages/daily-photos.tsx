import { useChildContext } from "@/hooks/use-child-context";
import { useDailyPhotos, useCreateDailyPhoto, useTodayPhoto, useDeleteDailyPhoto } from "@/hooks/use-daily-photos";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, ChevronLeft, ChevronRight, Check, ImagePlus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { PhotoView } from "@/components/ui/photo-view";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { X } from "lucide-react";

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

export default function DailyPhotos() {
  const { activeChild } = useChildContext();
  const { data: photos, isLoading } = useDailyPhotos(activeChild?.id || 0);
  const { data: todayPhoto } = useTodayPhoto(activeChild?.id || 0);
  const createPhoto = useCreateDailyPhoto();
  const deletePhoto = useDeleteDailyPhoto();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFeedback, setShowFeedback] = useState<{ url: string; message: string } | null>(null);
  const pickerOpenerRef = useRef<(() => void) | null>(null);

  // Cronological order: oldest first, newest last (timeline style)
  const sortedPhotos = photos?.slice().sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ) || [];

  const totalPhotos = sortedPhotos.length;
  const streakDays = calculateStreak(sortedPhotos.map(p => p.date));
  const newestIndex = totalPhotos - 1; // Last item is the newest (chronological order)

  // Initialize to newest photo when photos load
  useEffect(() => {
    if (totalPhotos > 0 && currentIndex === -1) {
      setCurrentIndex(newestIndex);
    }
  }, [totalPhotos, currentIndex, newestIndex]);

  const getEmotionalMessage = useCallback((currentStreak: number, hadRecentPhotos: boolean) => {
    const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
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
  }, [totalPhotos]);

  const hadPhotoYesterday = useMemo(() => {
    if (sortedPhotos.length === 0) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return sortedPhotos.some(p => p.date === yesterdayStr);
  }, [sortedPhotos]);

  const handlePhotoSelected = useCallback(async (file: File) => {
    if (!activeChild) return;

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoUrl = reader.result as string;
        const today = new Date().toISOString().split('T')[0];
        
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
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a foto.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [activeChild, createPhoto, toast, hadPhotoYesterday, streakDays, getEmotionalMessage]);

  const handleDeleteTodayPhoto = useCallback(async () => {
    if (!todayPhoto || !activeChild) return;
    
    setIsDeleting(true);
    try {
      await deletePhoto.mutateAsync({ id: todayPhoto.id, childId: activeChild.id });
      setTimeout(() => {
        pickerOpenerRef.current?.();
      }, 300);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [todayPhoto, activeChild, deletePhoto, toast]);

  const goToPrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const goToNext = () => {
    if (currentIndex < totalPhotos - 1) setCurrentIndex(currentIndex + 1);
  };

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
                    <p className="font-semibold text-green-700">Foto de hoje registrada!</p>
                    <p className="text-xs text-muted-foreground">Continue amanhã</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Registre o momento de hoje</p>
                    <p className="text-xs text-muted-foreground">Cada dia é único</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <PhotoPicker onPhotoSelected={handlePhotoSelected}>
                {(openPicker) => {
                  pickerOpenerRef.current = openPicker;
                  return todayPhoto ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteTodayPhoto}
                      disabled={isDeleting}
                      data-testid="button-delete-today-photo"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {isDeleting ? "..." : "Trocar"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={openPicker}
                      disabled={isUploading}
                      data-testid="button-add-today-photo"
                    >
                      <ImagePlus className="w-4 h-4 mr-1" />
                      {isUploading ? "..." : "Adicionar"}
                    </Button>
                  );
                }}
              </PhotoPicker>
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center disabled:opacity-30 transition-opacity"
                    data-testid="button-photo-prev"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={goToNext}
                    disabled={currentIndex === totalPhotos - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center disabled:opacity-30 transition-opacity"
                    data-testid="button-photo-next"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Photo Date */}
            <div className="text-center">
              <p className="font-semibold">
                {format(parseISO(sortedPhotos[currentIndex]?.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} de {totalPhotos}
              </p>
            </div>

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
                            : !isNewest ? "opacity-60 hover:opacity-100" : ""
                        }`}
                        data-testid={`button-thumbnail-${index}`}
                      >
                        <img
                          src={photo.photoUrl}
                          alt=""
                          className="w-full h-full object-cover rounded-lg"
                        />
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
          </div>
        )}

      </main>

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
  
  const sortedDates = [...dates].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
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
