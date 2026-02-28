import { useState } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useGrowthRecords } from "@/hooks/use-growth";
import { useSusVaccines, useVaccineRecords } from "@/hooks/use-vaccines";
import { useTodayPhoto, useDailyPhotos } from "@/hooks/use-daily-photos";
import { useGamification } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  formatDistanceToNow,
  differenceInMonths,
  differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Scale,
  Ruler,
  Heart,
  Star,
  ArrowRight,
  Activity,
  Stethoscope,
  Trophy,
  AlertTriangle,
  Camera,
  Check,
  Ticket,
} from "lucide-react";
import { Link } from "wouter";
import { parseLocalDate, formatDecimalBR } from "@/lib/utils";
import { motion } from "framer-motion";
import { getVaccineStatus } from "@/lib/vaccineCheck";
import { Button } from "@/components/ui/button";
import { RedeemCodeDialog } from "@/components/invite/redeem-code-dialog";

// Daily messages that rotate based on day of year - emotional, caring tone
const dailyMessages = [
  "Cada dia ao seu lado é uma nova história sendo escrita",
  "O amor que você dedica se reflete em cada olhar",
  "Cuidar é a forma mais silenciosa de amar",
  "Você está fazendo um trabalho lindo",
  "Pequenos gestos constroem grandes lembranças",
  "A presença é o maior presente que você pode dar",
  "Seu cuidado é a base de tudo que virá",
  "Cada momento junto vale ser guardado",
  "O carinho que você dá hoje ecoa para sempre",
  "Sua dedicação faz toda a diferença",
  "O tempo passa, mas o amor que você planta fica",
  "Estar presente é o maior ato de cuidado",
  "Você está construindo memórias que durarão a vida toda",
  "A constância do seu amor é a maior segurança",
];

// Get daily message based on day of year (changes once per day)
const getDailyMessage = (): string => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dailyMessages[dayOfYear % dailyMessages.length];
};

// Emotional phrases for gamification levels
const levelPhrases: Record<string, string> = {
  Iniciante: "Todo começo é feito de atenção",
  Cuidador: "Constância também é amor",
  Dedicado: "Seu cuidado faz diferença",
  Experiente: "Você conhece cada detalhe",
  Mestre: "Um exemplo de dedicação",
  Ouro: "Seu cuidado transforma vidas",
};

// Dynamic subtitle based on user state
const getEncouragementMessage = (
  hasRecentActivity: boolean,
  isCloseToLevelUp: boolean,
): string => {
  // Close to level up
  if (isCloseToLevelUp) {
    return "Você está quase alcançando um novo nível!";
  }

  // Has recent activity - validation message
  if (hasRecentActivity) {
    const validationMessages = [
      "Seu carinho está sendo registrado",
      "Cada registro é um ato de cuidado",
      "Você está acompanhando de perto",
      "Continue assim, você está indo bem",
    ];
    return validationMessages[
      Math.floor(Date.now() / 86400000) % validationMessages.length
    ];
  }

  // No recent activity - calm, presence-focused message
  const calmMessages = [
    "Tudo bem ir no seu ritmo",
    "Sua presença já é cuidado",
    "Não há pressa, apenas presença",
    "Você está aqui, e isso importa",
  ];
  return calmMessages[Math.floor(Date.now() / 86400000) % calmMessages.length];
};

// Micro invite phrases - gentle, no pressure
const getMicroInvite = (hasRecentActivity: boolean, months: number): string => {
  const invites = [
    "Que tal registrar como está o crescimento?",
    "As memórias de hoje serão tesouros amanhã",
    "Um registro rápido pode fazer a diferença",
    "Quando quiser, estamos aqui para ajudar",
  ];

  // Contextual invites based on state
  if (!hasRecentActivity && months <= 12) {
    return "Os primeiros meses passam rápido... que tal registrar?";
  }

  return invites[Math.floor(Date.now() / 86400000) % invites.length];
};

// Get emotional phrase for current level
const getLevelPhrase = (level: string | null | undefined): string => {
  if (!level) return levelPhrases["Iniciante"];
  for (const key of Object.keys(levelPhrases)) {
    if (level.toLowerCase().includes(key.toLowerCase())) {
      return levelPhrases[key];
    }
  }
  return levelPhrases["Iniciante"];
};

// Check if any records exist within the last 7 days
// Uses createdAt or applicationDate/date fields to determine recency
const checkRecentActivity = (
  growth: any[] | undefined,
  vaccineRecords: any[] | undefined,
): boolean => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Check growth records
  const hasRecentGrowth =
    growth?.some((record) => {
      const recordDate = record.createdAt
        ? new Date(record.createdAt)
        : new Date(record.date);
      return recordDate >= sevenDaysAgo;
    }) || false;

  // Check vaccine records
  const hasRecentVaccine =
    vaccineRecords?.some((record) => {
      const recordDate = record.createdAt
        ? new Date(record.createdAt)
        : new Date(record.applicationDate);
      return recordDate >= sevenDaysAgo;
    }) || false;

  return hasRecentGrowth || hasRecentVaccine;
};

// Check if close to next level (within 15 points of next threshold)
const isCloseToNextLevel = (points: number): boolean => {
  const pointsInCurrentLevel = points % 100;
  return pointsInCurrentLevel >= 85;
};

export default function Dashboard() {
  const { activeChild, isLoading } = useChildContext();
  const { data: growth } = useGrowthRecords(activeChild?.id || 0);
  const { data: susVaccines } = useSusVaccines();
  const { data: vaccineRecords } = useVaccineRecords(activeChild?.id || 0);
  const { data: gamification } = useGamification(activeChild?.id || null);
  const { data: todayPhoto } = useTodayPhoto(activeChild?.id || 0);
  const { data: allPhotos } = useDailyPhotos(activeChild?.id || 0);
  const [redeemOpen, setRedeemOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <h2 className="text-xl font-bold mb-2">Nenhum perfil encontrado</h2>
          <p className="text-muted-foreground">
            Cadastre sua primeira criança ou use um código de convite para
            acompanhar uma criança.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/onboarding" className="btn-primary inline-block">
              Começar agora
            </Link>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setRedeemOpen(true)}
            >
              <Ticket className="w-4 h-4" /> Usar Código de Convite
            </Button>
          </div>
        </div>
        <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
      </div>
    );
  }

  // Calculations
  const birthDate = parseLocalDate(activeChild.birthDate);
  const age = formatDistanceToNow(birthDate, {
    locale: ptBR,
    addSuffix: false,
  });
  const months = differenceInMonths(new Date(), birthDate);
  const totalDays = differenceInDays(new Date(), birthDate);

  // Emotional age subtitle
  const getAgeSubtitle = () => {
    if (months < 1) {
      if (totalDays === 0) return "Primeiro dia juntos!";
      if (totalDays === 1) return "1 dia de puro amor";
      return `${totalDays} dias de puro amor`;
    }
    if (months === 1) return "1 mês de descobertas";
    if (months <= 3) return `${months} meses de conexão`;
    if (months <= 6) return `${months} meses crescendo juntos`;
    if (months <= 12) return `${months} meses de cuidado`;
    return `${months} meses sendo cuidado por você`;
  };

  // Get latest measurements with proper sorting
  const sortedByDate = (records: any[] | undefined) =>
    records
      ?.slice()
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ) || [];

  const latestWeightRaw =
    sortedByDate(growth?.filter((g) => g.weight))[0]?.weight ||
    activeChild.initialWeight;
  const latestWeight = latestWeightRaw
    ? formatDecimalBR(latestWeightRaw)
    : "--";

  const latestHeightRaw =
    sortedByDate(growth?.filter((g) => g.height))[0]?.height ||
    activeChild.initialHeight;
  const latestHeight = latestHeightRaw
    ? formatDecimalBR(latestHeightRaw, 1)
    : "--";

  const vaccineStatus =
    susVaccines && vaccineRecords
      ? getVaccineStatus(susVaccines, vaccineRecords, months)
      : { status: "upToDate" as const, pendingCount: 0, pendingVaccines: [] };

  const hasPendingVaccines = vaccineStatus.status === "pending";

  // Dynamic state calculations - now checks multiple record types
  const points = gamification?.points || 0;
  const recentActivity = checkRecentActivity(growth, vaccineRecords);
  const closeToLevelUp = isCloseToNextLevel(points);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Daily Message - Changes once per day */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground italic px-4"
        >
          "{getDailyMessage()}"
        </motion.p>

        {/* Welcome Section - Dynamic Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 rounded-3xl p-6 border border-primary/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-24 h-24 text-primary rotate-12" />
          </div>
          <div className="relative z-10">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
              Nível {gamification?.level || "Iniciante"}
            </h2>
            <p className="text-2xl font-display font-bold text-foreground mb-1">
              {getLevelPhrase(gamification?.level)}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              {getEncouragementMessage(recentActivity, closeToLevelUp)}
            </p>
            <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-primary h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(points % 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {points} pontos acumulados
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Idade"
            value={age}
            subtitle={getAgeSubtitle()}
            icon={<Activity className="w-5 h-5 text-purple-500" />}
            color="bg-purple-50/50 border-purple-100"
            delay={0.1}
          />
          <StatsCard
            title="Peso Atual"
            value={`${latestWeight} kg`}
            icon={<Scale className="w-5 h-5 text-blue-500" />}
            color="bg-blue-50/50 border-blue-100"
            delay={0.2}
          />
          <StatsCard
            title="Altura"
            value={`${latestHeight} cm`}
            icon={<Ruler className="w-5 h-5 text-emerald-500" />}
            color="bg-emerald-50/50 border-emerald-100"
            delay={0.3}
          />
          <Link href="/vaccines">
            <div className="cursor-pointer">
              <StatsCard
                title="Vacinas"
                value={hasPendingVaccines ? "Pendentes" : "Em dia"}
                subtitle={
                  hasPendingVaccines
                    ? `${vaccineStatus.pendingCount} vacina${vaccineStatus.pendingCount > 1 ? "s" : ""} atrasada${vaccineStatus.pendingCount > 1 ? "s" : ""}`
                    : "Você está cuidando muito bem!"
                }
                icon={
                  hasPendingVaccines ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Heart className="w-5 h-5 text-rose-500" />
                  )
                }
                color={
                  hasPendingVaccines
                    ? "bg-amber-50/50 border-amber-200"
                    : "bg-rose-50/50 border-rose-100"
                }
                delay={0.4}
              />
            </div>
          </Link>
        </div>

        {/* Foto do Dia Card */}
        <Link href="/daily-photos">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl border p-4 cursor-pointer active:scale-[0.98] transition-transform mt-4"
            style={{
              backgroundColor: todayPhoto
                ? "rgb(236 253 245)"
                : "rgb(254 252 232)",
              borderColor: todayPhoto ? "rgb(167 243 208)" : "rgb(254 240 138)",
            }}
            data-testid="card-daily-photo"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: todayPhoto
                    ? "rgb(167 243 208)"
                    : "rgb(254 240 138)",
                }}
              >
                {todayPhoto ? (
                  <Check className="w-7 h-7 text-green-600" />
                ) : (
                  <Camera className="w-7 h-7 text-amber-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base">
                  {todayPhoto ? "Foto de hoje registrada!" : "Foto do Dia"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {todayPhoto
                    ? `${allPhotos?.length || 0} foto${(allPhotos?.length || 0) !== 1 ? "s" : ""} no total`
                    : "Um registro por dia do crescimento"}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </motion.div>
        </Link>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-4"
        >
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            Acesso Rápido{" "}
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/growth">
              <div className="p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3 mx-auto">
                  <Scale className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-bold text-xs leading-tight">
                  Registrar
                  <br />
                  Medidas
                </p>
              </div>
            </Link>
            <Link href="/health">
              <div className="p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform text-center">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3 mx-auto">
                  <Stethoscope className="w-6 h-6 text-rose-600" />
                </div>
                <p className="font-bold text-xs leading-tight">
                  Anotar
                  <br />
                  Sintomas
                </p>
              </div>
            </Link>
            <Link href="/memories">
              <div className="p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3 mx-auto">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
                <p className="font-bold text-xs leading-tight">
                  Novo
                  <br />
                  Marco
                </p>
              </div>
            </Link>
          </div>

          {/* Micro Invite - Gentle nudge */}
          <p className="text-center text-xs text-muted-foreground mt-4 italic">
            {getMicroInvite(recentActivity, months)}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
