import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, Share2, Loader2, Clock, CheckCircle2 } from "lucide-react";

interface InviteCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: number;
  childName: string;
}

export function InviteCodeDialog({
  open,
  onOpenChange,
  childId,
  childName,
}: InviteCodeDialogProps) {
  const { toast } = useToast();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.invites.generate.path, { childId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship: "caregiver" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao gerar código");
      }
      return res.json() as Promise<{
        code: string;
        expiresAt: string;
        childName: string;
      }>;
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      setExpiresAt(data.expiresAt);
    },
    onError: (err: Error) => {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast({ title: "Código copiado!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!generatedCode) return;
    try {
      await navigator.share({
        title: "Convite Filhos",
        text: `Use o código ${generatedCode} no app Filhos para acompanhar ${childName}. O código expira em 48 horas.`,
      });
    } catch {
      // user canceled share or not supported, fall back to copy
      handleCopy();
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setGeneratedCode(null);
      setExpiresAt(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  const formatExpiry = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "48 horas";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Compartilhar {childName}</DialogTitle>
          <DialogDescription>
            Gere um código de convite para outro cuidador acompanhar {childName}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!generatedCode ? (
            <div className="text-center space-y-4">
              <div className="bg-muted/30 p-4 rounded-xl text-sm text-muted-foreground space-y-2">
                <p>O cuidador convidado poderá:</p>
                <ul className="text-left space-y-1">
                  <li>• Ver registros de crescimento</li>
                  <li>• Acompanhar vacinas</li>
                  <li>• Registrar novas informações</li>
                </ul>
              </div>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" /> Gerar Código de Convite
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-6">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                  Código de Convite
                </p>
                <p className="text-3xl font-mono font-bold tracking-[0.2em] text-primary">
                  {generatedCode}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  Expira em: {expiresAt ? formatExpiry(expiresAt) : "48 horas"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />{" "}
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" /> Copiar
                    </>
                  )}
                </Button>
                {"share" in navigator && (
                  <Button onClick={handleShare} className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Este código pode ser usado apenas uma vez.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            className="w-full"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
