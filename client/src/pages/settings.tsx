import { useState, useRef } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useChildren, useUpdateChild, useDeleteChild } from "@/hooks/use-children";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  User, Bell, Shield, LogOut, Baby, Pencil, Trash2, Plus, X, Check, Camera 
} from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getZodiacSign } from "@/lib/zodiac";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Child } from "@shared/schema";

export default function Settings() {
  const { activeChild, setActiveChildId } = useChildContext();
  const { data: children } = useChildren();
  const updateChild = useUpdateChild();
  const deleteChild = useDeleteChild();
  const { toast } = useToast();

  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [deletingChild, setDeletingChild] = useState<Child | null>(null);
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    name: "",
    birthDate: "",
    gender: "unspecified",
    theme: "neutral",
    initialWeight: "",
    initialHeight: "",
  });

  const openEditDialog = (child: Child) => {
    setEditingChild(child);
    setEditPhoto(child.photoUrl || null);
    setEditForm({
      name: child.name,
      birthDate: child.birthDate,
      gender: child.gender,
      theme: child.theme || "neutral",
      initialWeight: child.initialWeight || "",
      initialHeight: child.initialHeight || "",
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: "Escolha uma imagem menor que 10MB", variant: "destructive" });
        return;
      }
      try {
        const compressed = await compressImage(file, 400, 0.8);
        setEditPhoto(compressed);
      } catch {
        toast({ title: "Erro ao processar imagem", variant: "destructive" });
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingChild) return;
    try {
      await updateChild.mutateAsync({
        id: editingChild.id,
        name: editForm.name,
        birthDate: editForm.birthDate,
        gender: editForm.gender,
        theme: editForm.theme,
        initialWeight: editForm.initialWeight || null,
        initialHeight: editForm.initialHeight || null,
        photoUrl: editPhoto,
      });
      toast({ title: "Dados atualizados!", description: `${editForm.name} foi atualizado com sucesso.` });
      setEditingChild(null);
      setEditPhoto(null);
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar os dados.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingChild) return;
    try {
      await deleteChild.mutateAsync(deletingChild.id);
      toast({ title: "Perfil removido", description: `${deletingChild.name} foi removido.` });
      if (activeChild?.id === deletingChild.id && children && children.length > 1) {
        const remaining = children.filter(c => c.id !== deletingChild.id);
        if (remaining.length > 0) {
          setActiveChildId(remaining[0].id);
        }
      }
      setDeletingChild(null);
    } catch {
      toast({ title: "Erro", description: "Não foi possível remover o perfil.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Ajustes" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
           <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
             <User className="w-8 h-8 text-muted-foreground" />
           </div>
           <div>
             <h2 className="font-display font-bold text-lg">Responsável</h2>
             <p className="text-sm text-muted-foreground">admin@exemplo.com</p>
           </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-2 mr-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Crianças Cadastradas</h3>
            <Link href="/onboarding">
              <Button size="sm" variant="ghost" className="text-primary gap-1" data-testid="button-add-child">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </Link>
          </div>
          
          <div className="space-y-2">
            {children?.map((child) => (
              <div 
                key={child.id} 
                className={`bg-white p-4 rounded-xl border ${activeChild?.id === child.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'} flex items-center gap-3`}
                data-testid={`child-card-${child.id}`}
              >
                {child.photoUrl ? (
                  <img 
                    src={child.photoUrl} 
                    alt={child.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      child.theme === 'blue' ? 'bg-blue-400' : 
                      child.theme === 'pink' ? 'bg-pink-400' : 'bg-slate-400'
                    }`}
                  >
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{child.name}</p>
                  {(() => {
                    const zodiac = getZodiacSign(child.birthDate);
                    return (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(parseISO(child.birthDate), "dd/MM/yyyy")}</span>
                        {zodiac && (
                          <span className="text-primary font-medium">
                            {zodiac.symbol} {zodiac.name}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => openEditDialog(child)}
                    data-testid={`button-edit-child-${child.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setDeletingChild(child)}
                    data-testid={`button-delete-child-${child.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {(!children || children.length === 0) && (
              <div className="bg-muted/30 p-8 rounded-xl text-center">
                <Baby className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma criança cadastrada</p>
                <Link href="/onboarding">
                  <Button className="mt-4" data-testid="button-add-first-child">
                    <Plus className="w-4 h-4 mr-2" /> Cadastrar Criança
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-2">Configurações</h3>
          
          <div className="bg-white rounded-xl border border-border overflow-hidden">
             <div className="p-4 flex items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                     <Bell className="w-4 h-4" />
                   </div>
                   <Label>Notificações de Vacinas</Label>
                </div>
                <Switch defaultChecked data-testid="switch-notifications" />
             </div>
             <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                     <Shield className="w-4 h-4" />
                   </div>
                   <Label>Modo Privacidade</Label>
                </div>
                <Switch data-testid="switch-privacy" />
             </div>
          </div>
        </div>

        <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 mt-8" data-testid="button-logout">
           <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </main>

      <Dialog open={!!editingChild} onOpenChange={(open) => !open && setEditingChild(null)}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>Atualize os dados de {editingChild?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <input
                type="file"
                accept="image/*"
                ref={photoInputRef}
                onChange={handlePhotoChange}
                className="hidden"
                data-testid="input-edit-photo"
              />
              <div className="relative">
                {editPhoto ? (
                  <img 
                    src={editPhoto} 
                    alt="Foto"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-md"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl ${
                    editForm.theme === 'blue' ? 'bg-blue-400' : 
                    editForm.theme === 'pink' ? 'bg-pink-400' : 'bg-slate-400'
                  }`}>
                    {editForm.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-sm"
                  onClick={() => photoInputRef.current?.click()}
                  data-testid="button-upload-child-photo"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Toque para adicionar foto</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input 
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-birthdate">Data de Nascimento</Label>
              <Input 
                id="edit-birthdate"
                type="date"
                value={editForm.birthDate}
                onChange={(e) => setEditForm(f => ({ ...f, birthDate: e.target.value }))}
                data-testid="input-edit-birthdate"
              />
              {(() => {
                const zodiac = editForm.birthDate ? getZodiacSign(editForm.birthDate) : null;
                return zodiac ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Signo: <span className="text-primary font-medium">{zodiac.symbol} {zodiac.name}</span>
                  </p>
                ) : null;
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Sexo</Label>
              <Select value={editForm.gender} onValueChange={(v) => setEditForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger data-testid="select-edit-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="unspecified">Não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-theme">Tema</Label>
              <Select value={editForm.theme} onValueChange={(v) => setEditForm(f => ({ ...f, theme: v }))}>
                <SelectTrigger data-testid="select-edit-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="pink">Rosa</SelectItem>
                  <SelectItem value="neutral">Neutro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-weight">Peso (kg)</Label>
                <Input 
                  id="edit-weight"
                  type="number"
                  step="0.1"
                  value={editForm.initialWeight}
                  onChange={(e) => setEditForm(f => ({ ...f, initialWeight: e.target.value }))}
                  data-testid="input-edit-weight"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-height">Altura (cm)</Label>
                <Input 
                  id="edit-height"
                  type="number"
                  step="0.1"
                  value={editForm.initialHeight}
                  onChange={(e) => setEditForm(f => ({ ...f, initialHeight: e.target.value }))}
                  data-testid="input-edit-height"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingChild(null)} data-testid="button-cancel-edit">
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateChild.isPending} data-testid="button-confirm-edit">
              <Check className="w-4 h-4 mr-1" /> {updateChild.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingChild} onOpenChange={(open) => !open && setDeletingChild(null)}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deletingChild?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os registros de crescimento, vacinas, marcos e memórias desta criança serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="button-confirm-delete"
            >
              {deleteChild.isPending ? "Removendo..." : "Sim, remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
