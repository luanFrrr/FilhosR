import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Baby, Heart, TrendingUp, Camera, Shield, Star, ChevronRight } from "lucide-react";
import { SiGoogle, SiGithub, SiApple } from "react-icons/si";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 dark:from-rose-950/30 dark:via-background dark:to-sky-950/30">
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 mb-6 shadow-lg">
                <Baby className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground font-outfit mb-2">
                Filhos
              </h1>
              <p className="text-muted-foreground">
                Acompanhe cada momento especial
              </p>
            </div>

            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6">
                <div className="space-y-3">
                  <a href="/api/login" data-testid="button-login-google" className="block">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full justify-start gap-3 text-base font-medium"
                    >
                      <SiGoogle className="h-5 w-5 text-[#4285F4]" />
                      Continuar com Google
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </Button>
                  </a>
                  
                  <a href="/api/login" data-testid="button-login-github" className="block">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full justify-start gap-3 text-base font-medium"
                    >
                      <SiGithub className="h-5 w-5" />
                      Continuar com GitHub
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </Button>
                  </a>
                  
                  <a href="/api/login" data-testid="button-login-apple" className="block">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full justify-start gap-3 text-base font-medium"
                    >
                      <SiApple className="h-5 w-5" />
                      Continuar com Apple
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </Button>
                  </a>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <a href="/api/login" data-testid="button-login-email" className="block">
                    <Button 
                      size="lg" 
                      className="w-full text-base font-medium"
                    >
                      Entrar com Email
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground mt-6 px-4">
              Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="px-6 pb-8"
        >
          <div className="max-w-sm mx-auto">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs text-muted-foreground">Crescimento</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs text-muted-foreground">Vacinas</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs text-muted-foreground">Memórias</span>
              </div>
            </div>
          </div>
        </motion.div>

        <footer className="text-center text-xs text-muted-foreground pb-6">
          <p>Feito com carinho para pais brasileiros</p>
        </footer>
      </div>
    </div>
  );
}
