import { useChildContext } from "@/hooks/use-child-context";
import { useGrowthRecords } from "@/hooks/use-growth";
import { useVaccines } from "@/hooks/use-health";
import { useGamification } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { formatDistanceToNow, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scale, Ruler, Heart, Trophy, ArrowRight, Activity } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { activeChild, isLoading } = useChildContext();
  const { data: growth } = useGrowthRecords(activeChild?.id || 0);
  const { data: vaccines } = useVaccines(activeChild?.id || 0);
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
  const age = formatDistanceToNow(new Date(activeChild.birthDate), { locale: ptBR, addSuffix: false });
  const months = differenceInMonths(new Date(), new Date(activeChild.birthDate));
  
  const latestWeight = growth?.filter(g => g.weight).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.weight 
    || activeChild.initialWeight 
    || "--";
  
  const latestHeight = growth?.filter(g => g.height).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.height 
    || activeChild.initialHeight 
    || "--";

  const nextVaccine = vaccines?.filter(v => v.status === 'pending')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];

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
            <p className="text-2xl font-display font-bold text-foreground mb-2">
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
            subtitle={`${months} meses completos`}
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
          <Link href="/health">
            <div className="cursor-pointer">
              <StatsCard 
                title="Vacinas" 
                value={nextVaccine ? "Pendente" : "Em dia"}
                subtitle={nextVaccine ? `Próxima: ${nextVaccine.name}` : "Tudo certo!"}
                icon={<Heart className="w-5 h-5 text-rose-500" />}
                color="bg-rose-50/50 border-rose-100"
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
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
            <Link href="/growth">
              <div className="min-w-[140px] p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <Scale className="w-5 h-5 text-blue-600" />
                </div>
                <p className="font-bold text-sm">Registrar Medidas</p>
              </div>
            </Link>
            <Link href="/health">
               <div className="min-w-[140px] p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-3">
                  <Heart className="w-5 h-5 text-rose-600" />
                </div>
                <p className="font-bold text-sm">Anotar Sintomas</p>
              </div>
            </Link>
            <Link href="/memories">
               <div className="min-w-[140px] p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <p className="font-bold text-sm">Novo Marco</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
