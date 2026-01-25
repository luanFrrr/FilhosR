import { useChildContext } from "@/hooks/use-child-context";
import { useDailyPhotos, useCreateDailyPhoto, useTodayPhoto } from "@/hooks/use-daily-photos";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, ChevronLeft, ChevronRight, Check, ImagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useMemo } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { PhotoView } from "@/components/ui/photo-view";

const MENSAGENS_MOMENTO = [
  "Momento guardado com carinho",
  "Esse registro vai valer muito no futuro",
  "Um pedacinho do crescimento ficou salvo hoje",
  "Mais um dia especial registrado",
  "Que bom ter você presente nesse momento",
  "Essa memória agora é para sempre",
  "O tempo passa, mas esse momento fica",
  "Cada foto conta uma história de amor",
];

const MENSAGENS_SEQUENCIA = [
  "Você está construindo uma linda linha do tempo",
  "A constância transforma dias em memórias",
  "Cada dia seguido é uma prova de presença",
  "Sua dedicação está criando algo especial",
];

const MENSAGENS_RETORNO = [
  "Que bom ter você de volta",
  "Nunca é tarde para registrar um momento",
  "O importante é estar presente agora",
  "Cada dia é uma nova oportunidade",
];

export default function DailyPhotos() {
  const { activeChild } = useChildContext();
  const { data: photos, isLoading } = useDailyPhotos(activeChild?.id || 0);
  const { data: todayPhoto } = useTodayPhoto(activeChild?.id || 0);
  const createPhoto = useCreateDailyPhoto();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const sortedPhotos = photos?.slice().sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ) || [];

  const totalPhotos = sortedPhotos.length;
  const streakDays = calculateStreak(sortedPhotos.map(p => p.date));

  const getEmotionalMessage = useCallback((currentStreak: number, hadRecentPhotos: boolean) => {
    const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChild) return;

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
        
        toast({
          title: mensagem,
          description: newStreak >= 2 
            ? `${newStreak} dias seguidos registrando momentos` 
            : undefined,
        });
        setCurrentIndex(0);
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [activeChild, createPhoto, toast, hadPhotoYesterday, streakDays, getEmotionalMessage]);

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
      
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
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
            {!todayPhoto && (
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-add-today-photo"
              >
                <ImagePlus className="w-4 h-4 mr-1" />
                {isUploading ? "..." : "Tirar"}
              </Button>
            )}
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
        ) : totalPhotos === 0 ? (
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

            {/* Thumbnail Strip */}
            {totalPhotos > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {sortedPhotos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all ${
                      index === currentIndex 
                        ? "ring-2 ring-primary ring-offset-2" 
                        : "opacity-60 hover:opacity-100"
                    }`}
                    data-testid={`button-thumbnail-${index}`}
                  >
                    <img
                      src={photo.photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-photo-file"
        />
      </main>
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
