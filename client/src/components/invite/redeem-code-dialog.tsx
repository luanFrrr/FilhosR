import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Ticket, CheckCircle2 } from "lucide-react";

interface RedeemCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedeemCodeDialog({
  open,
  onOpenChange,
}: RedeemCodeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState<{ childName: string } | null>(null);

  const redeemMutation = useMutation({
    mutationFn: async (codeStr: string) => {
      const res = await fetch(api.invites.redeem.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeStr }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao resgatar código");
      }
      return data as { message: string; childName: string; childId: number };
    },
    onSuccess: (data) => {
      setSuccess({ childName: data.childName });
      queryClient.invalidateQueries({ queryKey: [api.children.list.path] });
      toast({ title: "Convite aceito!", description: data.message });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Auto-format: inserir hífen após "FLH"
  const handleCodeChange = (value: string) => {
    let v = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    // Auto-insert hyphen after FLH
    if (v.length === 3 && !v.includes("-")) {
      v = v + "-";
    }
    if (v.length > 8) v = v.slice(0, 8); // FLH-XXXX = 8 chars
    setCode(v);
  };

  const handleSubmit = () => {
    if (code.length < 5) {
      toast({
        title: "Código inválido",
        description: "Digite o código completo (ex: FLH-A3K9)",
        variant: "destructive",
      });
      return;
    }
    redeemMutation.mutate(code);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setCode("");
      setSuccess(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Usar Código de Convite</DialogTitle>
          <DialogDescription>
            Insira o código recebido para acompanhar uma criança.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!success ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="invite-code">Código</Label>
                <Input
                  id="invite-code"
                  placeholder="FLH-A3K9"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="text-center text-xl font-mono tracking-[0.15em] uppercase"
                  maxLength={8}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Formato: FLH-XXXX
                </p>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-lg">Convite aceito!</p>
                <p className="text-muted-foreground text-sm">
                  Você agora pode acompanhar{" "}
                  <strong>{success.childName}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!success ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={redeemMutation.isPending || code.length < 5}
              >
                {redeemMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Resgatando...
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4 mr-2" /> Resgatar
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => handleClose(false)} className="w-full">
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
