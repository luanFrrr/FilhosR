import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Baby, Heart, TrendingUp, Camera, Shield, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-blue-50 dark:from-pink-950/20 dark:to-blue-950/20">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Baby className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground font-outfit">
              Filhos
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Acompanhe cada momento especial do crescimento do seu filho
          </p>
        </header>

        <div className="flex justify-center mb-12">
          <a href="/api/login" data-testid="link-login">
            <Button size="lg" className="text-lg px-8 py-6">
              Entrar com sua conta
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold">Crescimento</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Registre peso, altura e perímetro cefálico com gráficos comparativos da OMS
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold">Vacinação</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Carteira de vacinação digital com calendário do SUS/PNI
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold">Saúde</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Histórico de consultas, doenças e medicamentos
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">Foto do Dia</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Capture um momento especial por dia e construa memórias
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="font-semibold">Marcos</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Registre os primeiros passos, palavras e conquistas
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30">
                  <Baby className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="font-semibold">Múltiplos Filhos</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Acompanhe todos os seus filhos em um só lugar
              </p>
            </CardContent>
          </Card>
        </div>

        <footer className="text-center text-sm text-muted-foreground">
          <p>Feito com carinho para pais brasileiros</p>
        </footer>
      </div>
    </div>
  );
}
