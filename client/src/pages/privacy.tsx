import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: Janeiro de 2025</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              O aplicativo <strong>Filhos</strong> ("nós", "nosso" ou "aplicativo") respeita sua privacidade e está comprometido em proteger seus dados pessoais. Esta política descreve como coletamos, usamos e protegemos suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Podemos coletar os seguintes tipos de informações:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Informações de conta (nome, email) quando você faz login</li>
              <li>Dados sobre seus filhos (nome, data de nascimento, peso, altura)</li>
              <li>Registros de saúde e vacinas</li>
              <li>Fotos e memórias que você escolhe salvar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Como Usamos seus Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Utilizamos suas informações para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Fornecer e manter o serviço do aplicativo</li>
              <li>Acompanhar o crescimento e desenvolvimento dos seus filhos</li>
              <li>Armazenar registros de saúde e vacinas</li>
              <li>Melhorar a experiência do usuário</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Proteção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Seus dados são armazenados de forma segura e criptografada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas quando necessário para operar o serviço ou quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Você tem o direito de:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Exportar seus dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies e Tecnologias</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para manter sua sessão ativa e melhorar a experiência do usuário. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar algumas funcionalidades do aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas através do aplicativo ou por email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas sobre esta política de privacidade ou sobre como tratamos seus dados, entre em contato conosco através das configurações do aplicativo.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t">
          <p className="text-sm text-muted-foreground text-center">
            © 2025 Filhos App. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
