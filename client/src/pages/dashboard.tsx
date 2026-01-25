import { useChildContext } from "@/hooks/use-child-context";
import { useGrowthRecords } from "@/hooks/use-growth";
import { useSusVaccines, useVaccineRecords } from "@/hooks/use-vaccines";
import { useGamification } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { formatDistanceToNow, differenceInMonths, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scale, Ruler, Heart, Star, ArrowRight, Activity, Stethoscope, Trophy, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { getVaccineStatus } from "@/lib/vaccineCheck";

// Emotional phrases for gamification levels
const levelPhrases: Record<string, string> = {
  "Iniciante": "Todo começo é feito de atenção",
  "Cuidador": "Constância também é amor",
  "Dedicado": "Seu cuidado faz diferença",
  "Experiente": "Você conhece cada detalhe",
  "Mestre": "Um exemplo de dedicação",
  "Ouro": "Seu cuidado transforma vidas",
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

export default function Dashboard() {
  const { activeChild, isLoading } = useChildContext();
  const { data: growth } = useGrowthRecords(activeChild?.id || 0);
  const { data: susVaccines } = useSusVaccines();
  const { data: vaccineRecords } = useVaccineRecords(activeChild?.id || 0);
  const { data: gamification } = useGamification();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!activeChild) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
      <div>
        <h2 className="text-xl font-bold mb-2">Nenhum perfil encontrado</h2>
        <p className="text-muted-foreground mb-4">Cadastre sua primeira criança para começar.</p>
        <Link href="/onboarding" className="btn-primary inline-block">Começar agora</Link>
      </div>
    </div>;
  }

  // Calculations
  const birthDate = parseISO(activeChild.birthDate);
  const age = formatDistanceToNow(birthDate, { locale: ptBR, addSuffix: false });
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
  
  const latestWeight = growth?.filter(g => g.weight).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.weight 
    || activeChild.initialWeight 
    || "--";
  
  const latestHeight = growth?.filter(g => g.height).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.height 
    || activeChild.initialHeight 
    || "--";

  const vaccineStatus = susVaccines && vaccineRecords 
    ? getVaccineStatus(susVaccines, vaccineRecords, months)
    : { status: "upToDate" as const, pendingCount: 0, pendingVaccines: [] };
  
  const hasPendingVaccines = vaccineStatus.status === "pending";

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 rounded-3xl p-6 border border-primary/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-24 h-24 text-primary rotate-12" />
          </div>
          <div className="relative z-10">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Nível {gamification?.level || "Iniciante"}</h2>
            <p className="text-2xl font-display font-bold text-foreground mb-1">
              {getLevelPhrase(gamification?.level)}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Você está indo muito bem!
            </p>
            <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden mb-2">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min((gamification?.points || 0) % 100, 100)}%` }} 
              />
            </div>
            <p className="text-xs text-muted-foreground">{gamification?.points || 0} pontos acumulados</p>
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
                subtitle={hasPendingVaccines 
                  ? `${vaccineStatus.pendingCount} vacina${vaccineStatus.pendingCount > 1 ? 's' : ''} atrasada${vaccineStatus.pendingCount > 1 ? 's' : ''}`
                  : "Você está cuidando muito bem!"}
                icon={hasPendingVaccines 
                  ? <AlertTriangle className="w-5 h-5 text-amber-500" />
                  : <Heart className="w-5 h-5 text-rose-500" />}
                color={hasPendingVaccines 
                  ? "bg-amber-50/50 border-amber-200" 
                  : "bg-rose-50/50 border-rose-100"}
                delay={0.4}
              />
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-4"
        >
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            Acesso Rápido <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/growth">
              <div className="p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3 mx-auto">
                  <Scale className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-bold text-xs leading-tight">Registrar<br/>Medidas</p>
              </div>
            </Link>
            <Link href="/health">
               <div className="p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform text-center">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3 mx-auto">
                  <Stethoscope className="w-6 h-6 text-rose-600" />
                </div>
                <p className="font-bold text-xs leading-tight">Anotar<br/>Sintomas</p>
              </div>
            </Link>
            <Link href="/memories">
               <div className="p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3 mx-auto">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
                <p className="font-bold text-xs leading-tight">Novo<br/>Marco</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
