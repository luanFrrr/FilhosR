import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DeleteAccount() {
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== "EXCLUIR") {
      toast({
        title: "Confirmação incorreta",
        description: "Digite EXCLUIR para confirmar",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", "/api/account");
      toast({
        title: "Conta excluída",
        description: "Sua conta foi excluída com sucesso.",
      });
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8">
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

        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-red-700 dark:text-red-400">Excluir Conta</h1>
              <p className="text-sm text-red-600 dark:text-red-400">Esta ação é irreversível</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">O que será excluído:</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Todos os perfis de crianças cadastradas
            </li>
            <li className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Registros de crescimento e medidas
            </li>
            <li className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Carteira de vacinação completa
            </li>
            <li className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Registros de saúde e consultas
            </li>
            <li className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Marcos e memórias
            </li>
            <li className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Fotos do dia
            </li>
            <li className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Sua conta e todos os dados pessoais
            </li>
          </ul>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Para confirmar, digite <span className="font-bold text-red-600">EXCLUIR</span> abaixo:
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
              placeholder="Digite EXCLUIR"
              className="text-center font-mono uppercase"
              data-testid="input-confirmation"
            />
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={confirmation !== "EXCLUIR" || isDeleting}
            data-testid="button-delete-account"
          >
            {isDeleting ? "Excluindo..." : "Excluir minha conta permanentemente"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Após a exclusão, você será desconectado automaticamente e não poderá recuperar seus dados.
          </p>
        </div>
      </div>
    </div>
  );
}
