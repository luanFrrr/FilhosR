import { useState, useEffect } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import {
  useChildren,
  useChildrenWithRoles,
  useUpdateChild,
  useDeleteChild,
  useCaregivers,
  useRemoveCaregiver,
  useLeaveChild,
} from "@/hooks/use-children";
import { useGrowthRecords, useUpdateGrowthRecord } from "@/hooks/use-growth";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import type { Child } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Baby,
  Pencil,
  Trash2,
  Plus,
  X,
  Check,
  Camera,
  BellRing,
  Loader2,
  Share2,
  Ticket,
  Users,
  UserMinus,
  DoorOpen,
} from "lucide-react";
import { InviteCodeDialog } from "@/components/invite/invite-code-dialog";
import { RedeemCodeDialog } from "@/components/invite/redeem-code-dialog";
import { compressImage } from "@/lib/imageUtils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getZodiacSign } from "@/lib/zodiac";
import { format } from "date-fns";
import { parseLocalDate, parseDecimalBR, formatDecimalBR } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/use-push-notifications";
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
import { PhotoView } from "@/components/ui/photo-view";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { UserAvatar } from "@/components/ui/user-avatar";

function CaregiversList({ childId, isOwner, onRemove }: {
  childId: number;
  isOwner: boolean;
  onRemove: (caregiverId: number, name: string) => void;
}) {
  const { data: caregiversData } = useCaregivers(childId);

  if (!caregiversData || caregiversData.length <= 1) return null;

  const otherCaregivers = caregiversData.filter(c => c.role !== "owner");
  if (otherCaregivers.length === 0) return null;

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>Cuidadores</span>
      </div>
      {otherCaregivers.map((c) => (
        <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
              <UserAvatar
                profileImageUrl={undefined}
                firstName={c.userFirstName}
                lastName={c.userLastName}
                email={c.userEmail}
                size={28}
              />
            </div>
            <span className="text-sm truncate" data-testid={`text-caregiver-name-${c.id}`}>
              {[c.userFirstName, c.userLastName].filter(Boolean).join(" ") || c.userEmail || "Cuidador"}
            </span>
          </div>
          {isOwner && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRemove(c.id, [c.userFirstName, c.userLastName].filter(Boolean).join(" ") || c.userEmail || "Cuidador")}
              data-testid={`button-remove-caregiver-${c.id}`}
            >
              <UserMinus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const { activeChild, setActiveChildId } = useChildContext();
  const { data: children } = useChildren();
  const { data: childrenWithRoles } = useChildrenWithRoles();
  const updateChild = useUpdateChild();
  const deleteChild = useDeleteChild();
  const removeCaregiver = useRemoveCaregiver();
  const leaveChild = useLeaveChild();
  const updateGrowth = useUpdateGrowthRecord();
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    sendTest,
    isSupported,
  } = usePushNotifications();
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [deletingChild, setDeletingChild] = useState<Child | null>(null);
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [sharingChild, setSharingChild] = useState<Child | null>(null);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    birthDate: "",
    gender: "unspecified",
    theme: "neutral",
    initialWeight: "",
    initialHeight: "",
    initialHeadCircumference: "",
  });

  const openEditDialog = (child: Child) => {
    setEditingChild(child);
    setEditPhoto(child.photoUrl || null);
    setEditForm({
      name: child.name,
      birthDate: child.birthDate,
      gender: child.gender,
      theme: child.theme || "neutral",
      initialWeight: child.initialWeight
        ? formatDecimalBR(child.initialWeight)
        : "",
      initialHeight: child.initialHeight
        ? formatDecimalBR(child.initialHeight, 1)
        : "",
      initialHeadCircumference: child.initialHeadCircumference
        ? formatDecimalBR(child.initialHeadCircumference, 1)
        : "",
    });
  };

  const handlePhotoFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Imagem muito grande",
        description: "Escolha uma imagem menor que 10MB",
        variant: "destructive",
      });
      return;
    }
    try {
      const compressed = await compressImage(file, 400, 0.8);
      setEditPhoto(compressed);
    } catch {
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editingChild) return;

    const weight = parseDecimalBR(editForm.initialWeight);
    const height = parseDecimalBR(editForm.initialHeight);
    const head = parseDecimalBR(editForm.initialHeadCircumference);

    try {
      await updateChild.mutateAsync({
        id: editingChild.id,
        name: editForm.name,
        birthDate: editForm.birthDate,
        gender: editForm.gender,
        theme: editForm.theme,
        initialWeight: weight !== null ? weight.toString() : null,
        initialHeight: height !== null ? height.toString() : null,
        initialHeadCircumference: head !== null ? head.toString() : null,
        photoUrl: editPhoto,
      });

      // Also update the birth growth record if it exists
      // This keeps the dashboard in sync with settings
      try {
        const growthRes = await fetch(
          `/api/children/${editingChild.id}/growth`,
        );
        if (growthRes.ok) {
          const growthRecords = await growthRes.json();
          const birthRecord = growthRecords.find(
            (g: any) => g.date === editForm.birthDate,
          );
          if (birthRecord) {
            await updateGrowth.mutateAsync({
              id: birthRecord.id,
              childId: editingChild.id,
              weight: weight !== null ? weight.toString() : birthRecord.weight,
              height: height !== null ? height.toString() : birthRecord.height,
              headCircumference:
                head !== null ? head.toString() : birthRecord.headCircumference,
            });
          }
        }
      } catch {
        // Silent fail for growth update - child data was already saved
      }

      toast({
        title: "Dados atualizados!",
        description: `${editForm.name} foi atualizado com sucesso.`,
      });
      setEditingChild(null);
      setEditPhoto(null);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingChild) return;
    try {
      await deleteChild.mutateAsync(deletingChild.id);
      toast({
        title: "Perfil removido",
        description: `${deletingChild.name} foi removido.`,
      });
      if (
        activeChild?.id === deletingChild.id &&
        children &&
        children.length > 1
      ) {
        const remaining = children.filter((c) => c.id !== deletingChild.id);
        if (remaining.length > 0) {
          setActiveChildId(remaining[0].id);
        }
      }
      setDeletingChild(null);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível remover o perfil.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Ajustes" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div
          className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4"
          data-testid="user-profile-card"
        >
          <UserAvatar
            profileImageUrl={user?.profileImageUrl}
            firstName={user?.firstName}
            lastName={user?.lastName}
            email={user?.email}
            size={64}
          />
          <div>
            <h2
              className="font-display font-bold text-lg"
              data-testid="text-user-name"
            >
              {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Responsável"}
            </h2>
            <p
              className="text-sm text-muted-foreground"
              data-testid="text-user-email"
            >
              {user?.email || ""}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-2 mr-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Crianças Cadastradas
            </h3>
            <Link href="/onboarding">
              <Button
                size="sm"
                variant="ghost"
                className="text-primary gap-1"
                data-testid="button-add-child"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {children?.map((child) => {
              const roleInfo = childrenWithRoles?.find((c: any) => c.id === child.id);
              const isOwner = roleInfo?.role === "owner";
              return (
                <div key={child.id} className="space-y-2">
                  <div
                    className={`bg-white p-4 rounded-xl border ${activeChild?.id === child.id ? "border-primary ring-2 ring-primary/20" : "border-border"} flex items-center gap-3`}
                    data-testid={`child-card-${child.id}`}
                  >
                    <PhotoView src={child.photoUrl || null} alt={child.name}>
                      {child.photoUrl ? (
                        <img
                          src={child.photoUrl}
                          alt={child.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                            child.theme === "blue"
                              ? "bg-blue-400"
                              : child.theme === "pink"
                                ? "bg-pink-400"
                                : "bg-slate-400"
                          }`}
                        >
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </PhotoView>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{child.name}</p>
                      {(() => {
                        const zodiac = getZodiacSign(child.birthDate);
                        return (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {format(
                                parseLocalDate(child.birthDate),
                                "dd/MM/yyyy",
                              )}
                            </span>
                            {zodiac && (
                              <span className="text-primary font-medium">
                                {zodiac.symbol} {zodiac.name}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {!isOwner && (
                        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Cuidador
                        </span>
                      )}
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
                      {isOwner && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingChild(child)}
                          data-testid={`button-delete-child-${child.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <>
                      <CaregiversList
                        childId={child.id}
                        isOwner={true}
                        onRemove={(caregiverId, displayName) => {
                          if (confirm(`Remover ${displayName} como cuidador(a)?`)) {
                            removeCaregiver.mutate(
                              { childId: child.id, caregiverId },
                              {
                                onSuccess: () => toast({ title: `${displayName} removido(a)` }),
                                onError: (e) => toast({ title: e.message, variant: "destructive" }),
                              }
                            );
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/5"
                        onClick={() => setSharingChild(child)}
                        data-testid={`button-invite-caregiver-${child.id}`}
                      >
                        <Share2 className="w-4 h-4" /> Convidar cuidador
                      </Button>
                    </>
                  )}
                  {!isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => {
                        if (confirm(`Deseja sair do cuidado de ${child.name}? Você perderá o acesso.`)) {
                          leaveChild.mutate(child.id, {
                            onSuccess: () => {
                              toast({ title: `Você saiu do cuidado de ${child.name}` });
                              setActiveChildId(null);
                            },
                            onError: (e) => toast({ title: e.message, variant: "destructive" }),
                          });
                        }
                      }}
                      disabled={leaveChild.isPending}
                      data-testid={`button-leave-child-${child.id}`}
                    >
                      <DoorOpen className="w-4 h-4" /> Sair do cuidado
                    </Button>
                  )}
                </div>
              );
            })}

            {(!children || children.length === 0) && (
              <div className="bg-muted/30 p-8 rounded-xl text-center">
                <Baby className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Nenhuma criança cadastrada
                </p>
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
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-2">
            Configurações
          </h3>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <Label>Notificações de Vacinas</Label>
                  {!isSupported && (
                    <p className="text-xs text-muted-foreground">
                      Não suportado neste navegador
                    </p>
                  )}
                </div>
              </div>
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      subscribe();
                    } else {
                      unsubscribe();
                    }
                  }}
                  disabled={!isSupported || pushLoading}
                  data-testid="switch-notifications"
                />
              )}
            </div>
            {isSubscribed && (
              <div className="px-4 py-3 border-b border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-sm gap-2"
                  onClick={sendTest}
                  data-testid="button-test-notification"
                >
                  <BellRing className="w-4 h-4" /> Enviar notificação de teste
                </Button>
              </div>
            )}
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

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setRedeemOpen(true)}
          data-testid="button-redeem-invite"
        >
          <Ticket className="w-4 h-4" /> Usar Código de Convite
        </Button>

        <a href="/api/logout" data-testid="link-logout">
          <Button
            variant="outline"
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 mt-8"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
          </Button>
        </a>

        <Link href="/delete-account">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-red-500 mt-2 text-sm"
            data-testid="button-delete-account-link"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Excluir minha conta
          </Button>
        </Link>
      </main>

      <Dialog
        open={!!editingChild}
        onOpenChange={(open) => !open && setEditingChild(null)}
      >
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize os dados de {editingChild?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PhotoPicker onPhotoSelected={handlePhotoFile}>
              {(openPicker) => (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    {editPhoto ? (
                      <img
                        src={editPhoto}
                        alt="Foto"
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-md"
                      />
                    ) : (
                      <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl ${
                          editForm.theme === "blue"
                            ? "bg-blue-400"
                            : editForm.theme === "pink"
                              ? "bg-pink-400"
                              : "bg-slate-400"
                        }`}
                      >
                        {editForm.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-sm"
                      onClick={openPicker}
                      data-testid="button-upload-child-photo"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Toque para adicionar foto
                  </p>
                </div>
              )}
            </PhotoPicker>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-birthdate">Data de Nascimento</Label>
              <Input
                id="edit-birthdate"
                type="date"
                value={editForm.birthDate}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, birthDate: e.target.value }))
                }
                data-testid="input-edit-birthdate"
              />
              {(() => {
                const zodiac = editForm.birthDate
                  ? getZodiacSign(editForm.birthDate)
                  : null;
                return zodiac ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Signo:{" "}
                    <span className="text-primary font-medium">
                      {zodiac.symbol} {zodiac.name}
                    </span>
                  </p>
                ) : null;
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Sexo</Label>
              <Select
                value={editForm.gender}
                onValueChange={(v) => setEditForm((f) => ({ ...f, gender: v }))}
              >
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
              <Select
                value={editForm.theme}
                onValueChange={(v) => setEditForm((f) => ({ ...f, theme: v }))}
              >
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-weight" className="text-xs">
                  Peso (kg)
                </Label>
                <DecimalInput
                  id="edit-weight"
                  placeholder="3,50"
                  value={editForm.initialWeight}
                  onChange={(value) =>
                    setEditForm((f) => ({ ...f, initialWeight: value }))
                  }
                  data-testid="input-edit-weight"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-height" className="text-xs">
                  Altura (cm)
                </Label>
                <DecimalInput
                  id="edit-height"
                  placeholder="50,0"
                  value={editForm.initialHeight}
                  onChange={(value) =>
                    setEditForm((f) => ({ ...f, initialHeight: value }))
                  }
                  decimalPlaces={1}
                  data-testid="input-edit-height"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-head" className="text-xs">
                  P. Cefálico (cm)
                </Label>
                <DecimalInput
                  id="edit-head"
                  placeholder="35,0"
                  value={editForm.initialHeadCircumference}
                  onChange={(value) =>
                    setEditForm((f) => ({
                      ...f,
                      initialHeadCircumference: value,
                    }))
                  }
                  decimalPlaces={1}
                  data-testid="input-edit-head"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingChild(null)}
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateChild.isPending}
              data-testid="button-confirm-edit"
            >
              <Check className="w-4 h-4 mr-1" />{" "}
              {updateChild.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingChild}
        onOpenChange={(open) => !open && setDeletingChild(null)}
      >
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deletingChild?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os registros de
              crescimento, vacinas, marcos e memórias desta criança serão
              permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
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

      {sharingChild && (
        <InviteCodeDialog
          open={!!sharingChild}
          onOpenChange={(open) => !open && setSharingChild(null)}
          childId={sharingChild.id}
          childName={sharingChild.name}
        />
      )}

      <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
    </div>
  );
}
