import { useState, useRef, useEffect } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, useDiary, useCreateDiaryEntry } from "@/hooks/use-memories";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star, Book, Image as ImageIcon, Camera, X, Edit2, Trash2, Heart, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageUtils";
import { motion, AnimatePresence } from "framer-motion";
import type { Milestone } from "@shared/schema";

const celebrationMessages = [
  { title: "Que momento especial!", subtitle: "Cada conquista é um tesouro para guardar no coração" },
  { title: "Parabéns, papais!", subtitle: "Vocês estão construindo memórias lindas juntos" },
  { title: "Marco registrado!", subtitle: "Esse momento ficará eternizado para sempre" },
  { title: "Que orgulho!", subtitle: "Cada pequeno passo é uma grande vitória" },
  { title: "Momento mágico salvo!", subtitle: "O amor de vocês está em cada detalhe" },
  { title: "Conquista desbloqueada!", subtitle: "A jornada da maternidade/paternidade é incrível" },
  { title: "Lembranças preciosas!", subtitle: "Um dia vocês vão olhar para trás e sorrir" },
  { title: "Que emoção!", subtitle: "Esses momentos são o que fazem a vida valer a pena" },
  { title: "Eternizado com carinho!", subtitle: "Cada marco é uma estrela no céu de vocês" },
  { title: "Momento inesquecível!", subtitle: "O amor cresce a cada dia junto com seu pequeno" },
];

export default function Memories() {
  const { activeChild } = useChildContext();
  const { data: milestones } = useMilestones(activeChild?.id || 0);
  const { data: diary } = useDiary(activeChild?.id || 0);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const createDiary = useCreateDiaryEntry();
  const { toast } = useToast();
  const [openMilestone, setOpenMilestone] = useState(false);
  const [openDiary, setOpenDiary] = useState(false);
  const [milestoneImage, setMilestoneImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewMilestone, setViewMilestone] = useState<Milestone | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Milestone | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState({ title: "", subtitle: "" });

  const milestoneForm = useForm();
  const editForm = useForm();
  const diaryForm = useForm();

  useEffect(() => {
    if (editingMilestone) {
      editForm.reset({
        date: editingMilestone.date,
        title: editingMilestone.title,
        description: editingMilestone.description || "",
      });
      setMilestoneImage(editingMilestone.photoUrl || null);
    }
  }, [editingMilestone, editForm]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: "Escolha uma imagem menor que 15MB", variant: "destructive" });
        return;
      }
      try {
        const compressedImage = await compressImage(file, 1200, 0.8);
        const sizeInKB = Math.round(compressedImage.length * 0.75 / 1024);
        if (sizeInKB > 8000) {
          toast({ title: "Imagem ainda muito grande", description: "Tente uma foto com menor resolução", variant: "destructive" });
          return;
        }
        setMilestoneImage(compressedImage);
      } catch {
        toast({ title: "Erro ao processar imagem", variant: "destructive" });
      }
    }
  };

  const triggerCelebration = () => {
    const msg = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
    setCelebrationMsg(msg);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3500);
  };

  const onSubmitMilestone = (data: any) => {
    if (!activeChild) return;
    
    // Fix date offset issue by ensuring YYYY-MM-DD
    const date = data.date.includes('T') ? data.date.split('T')[0] : data.date;
    
    createMilestone.mutate({ 
      childId: activeChild.id, 
      ...data,
      date,
      photoUrl: milestoneImage || null
    }, {
      onSuccess: () => {
        setOpenMilestone(false);
        milestoneForm.reset();
        setMilestoneImage(null);
        triggerCelebration();
      }
    });
  };

  const onSubmitEdit = (data: any) => {
    if (!activeChild || !editingMilestone) return;
    
    // Fix date offset issue
    const date = data.date.includes('T') ? data.date.split('T')[0] : data.date;
    
    updateRecord.mutate({
      childId: activeChild.id,
      milestoneId: editingMilestone.id,
      ...data,
      date,
      photoUrl: milestoneImage
    }, {
      onSuccess: () => {
        setEditingMilestone(null);
        editForm.reset();
        setMilestoneImage(null);
        toast({ title: "Marco atualizado!" });
      }
    });
  };

  const handleDelete = () => {
    if (!activeChild || !deleteConfirm) return;
    deleteMilestone.mutate({
      childId: activeChild.id,
      milestoneId: deleteConfirm.id
    }, {
      onSuccess: () => {
        setDeleteConfirm(null);
        setViewMilestone(null);
        toast({ title: "Marco excluído" });
      }
    });
  };

  const onSubmitDiary = (data: any) => {
    if (!activeChild) return;
    createDiary.mutate({ childId: activeChild.id, ...data, photoUrls: [] }, {
      onSuccess: () => {
        setOpenDiary(false);
        diaryForm.reset();
        toast({ title: "Diário atualizado!" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Memórias" showChildSelector={false} />

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 p-8 rounded-3xl text-white text-center max-w-sm shadow-2xl"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="mb-4"
              >
                <Heart className="w-16 h-16 mx-auto fill-white" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
                <h2 className="text-2xl font-bold mb-2">{celebrationMsg.title}</h2>
                <p className="text-white/90">{celebrationMsg.subtitle}</p>
                <div className="mt-4 text-sm bg-white/20 rounded-full px-4 py-2 inline-block">
                  +20 pontos de amor
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-md mx-auto px-4 py-6">
        <Tabs defaultValue="milestones" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 h-auto rounded-xl">
             <TabsTrigger value="milestones" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
               <Star className="w-4 h-4 mr-2" /> Marcos
             </TabsTrigger>
             <TabsTrigger value="diary" className="py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
               <Book className="w-4 h-4 mr-2" /> Diário
             </TabsTrigger>
          </TabsList>

          <TabsContent value="milestones">
            <div className="bg-gradient-to-r from-primary/10 via-pink-100/50 to-purple-100/50 rounded-2xl p-4 mb-6 border border-primary/10">
              <p className="text-center text-sm text-muted-foreground italic font-hand">
                "Esses momentos passam rápido. Ainda bem que você guardou."
              </p>
            </div>
            
            <div className="mb-6 flex justify-end">
               <Dialog open={openMilestone} onOpenChange={(open) => {
                 setOpenMilestone(open);
                 if (!open) {
                   setMilestoneImage(null);
                   milestoneForm.reset();
                 }
               }}>
                 <DialogTrigger asChild>
                   <Button className="rounded-full" data-testid="button-new-milestone">
                     <Heart className="w-4 h-4 mr-2" /> Guardar lembrança
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="rounded-2xl max-w-sm mx-auto">
                   <DialogHeader>
                     <DialogTitle>Guardar uma lembrança</DialogTitle>
                     <DialogDescription>Esse momento merece ser eternizado com carinho</DialogDescription>
                   </DialogHeader>
                   <form onSubmit={milestoneForm.handleSubmit(onSubmitMilestone)} className="space-y-4 pt-2">
                     <div className="space-y-2">
                       <Label>Data</Label>
                       <Input type="date" {...milestoneForm.register("date")} data-testid="input-milestone-date" />
                     </div>
                     <div className="space-y-2">
                       <Label>Título</Label>
                       <Input placeholder="Ex: Primeiro sorriso" {...milestoneForm.register("title")} data-testid="input-milestone-title" />
                     </div>
                     <div className="space-y-2">
                       <Label>Descrição</Label>
                       <Textarea placeholder="Como foi esse momento?" {...milestoneForm.register("description")} data-testid="input-milestone-description" />
                     </div>
                     
                     <div className="space-y-2">
                       <Label>Foto do momento</Label>
                       <input
                         type="file"
                         accept="image/*"
                         ref={fileInputRef}
                         onChange={handleImageChange}
                         className="hidden"
                         data-testid="input-milestone-photo"
                       />
                       {milestoneImage ? (
                         <div className="relative">
                           <img 
                             src={milestoneImage} 
                             alt="Preview" 
                             className="w-full h-40 object-cover rounded-xl border border-border"
                           />
                           <Button
                             type="button"
                             size="icon"
                             variant="destructive"
                             className="absolute top-2 right-2 h-8 w-8 rounded-full"
                             onClick={() => setMilestoneImage(null)}
                             data-testid="button-remove-photo"
                           >
                             <X className="w-4 h-4" />
                           </Button>
                         </div>
                       ) : (
                         <Button
                           type="button"
                           variant="outline"
                           className="w-full h-24 border-dashed flex flex-col gap-2"
                           onClick={() => fileInputRef.current?.click()}
                           data-testid="button-upload-photo"
                         >
                           <Camera className="w-6 h-6 text-muted-foreground" />
                           <span className="text-sm text-muted-foreground">Adicionar foto</span>
                         </Button>
                       )}
                     </div>

                     <Button type="submit" className="w-full" disabled={createMilestone.isPending} data-testid="button-save-milestone">
                       {createMilestone.isPending ? "Guardando..." : "Guardar lembrança"}
                     </Button>
                   </form>
                 </DialogContent>
               </Dialog>
            </div>

            <div className="relative border-l-2 border-primary/20 ml-4 space-y-8 pb-8">
               {milestones?.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((milestone) => (
                 <div 
                   key={milestone.id} 
                   className="relative pl-6 cursor-pointer group"
                   onClick={() => setViewMilestone(milestone)}
                   data-testid={`milestone-item-${milestone.id}`}
                 >
                   <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                   <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">
                     {format(parseISO(milestone.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                   </span>
                   <div className="bg-white p-4 rounded-xl border border-border shadow-sm group-hover:shadow-md transition-shadow">
                     {milestone.photoUrl && (
                       <img 
                         src={milestone.photoUrl} 
                         alt={milestone.title} 
                         className="w-full h-32 object-cover rounded-lg mb-3"
                       />
                     )}
                     <h3 className="font-display font-bold text-lg mb-2">{milestone.title}</h3>
                     <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">{milestone.description}</p>
                     <p className="text-xs text-primary mt-2">Toque para ver detalhes</p>
                   </div>
                 </div>
               ))}
               {(!milestones || milestones.length === 0) && (
                 <p className="pl-6 text-muted-foreground italic">Registre os primeiros momentos especiais...</p>
               )}
            </div>
          </TabsContent>

          <TabsContent value="diary">
             <div className="mb-6 flex justify-end">
               <Dialog open={openDiary} onOpenChange={setOpenDiary}>
                 <DialogTrigger asChild>
                   <Button className="rounded-full" data-testid="button-new-diary">+ Escrever</Button>
                 </DialogTrigger>
                 <DialogContent className="rounded-2xl max-w-sm mx-auto">
                   <DialogHeader>
                     <DialogTitle>Querido Diário...</DialogTitle>
                     <DialogDescription>Escreva sobre o dia de hoje</DialogDescription>
                   </DialogHeader>
                   <form onSubmit={diaryForm.handleSubmit(onSubmitDiary)} className="space-y-4 pt-2">
                     <div className="space-y-2">
                       <Label>Data</Label>
                       <Input type="date" {...diaryForm.register("date")} data-testid="input-diary-date" />
                     </div>
                     <div className="space-y-2">
                       <Label>O que aconteceu hoje?</Label>
                       <Textarea {...diaryForm.register("content")} className="min-h-[120px]" data-testid="input-diary-content" />
                     </div>
                     <Button type="submit" className="w-full" disabled={createDiary.isPending} data-testid="button-save-diary">
                       {createDiary.isPending ? "Salvando..." : "Salvar no Diário"}
                     </Button>
                   </form>
                 </DialogContent>
               </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {diary?.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                <div key={entry.id} className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-border">
                    <span className="font-hand text-lg font-bold text-primary">
                       {format(parseISO(entry.date), "dd/MM/yyyy")}
                    </span>
                    {entry.photoUrls && entry.photoUrls.length > 0 && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <p className="text-foreground leading-relaxed font-hand text-lg">{entry.content}</p>
                </div>
              ))}
              {(!diary || diary.length === 0) && (
                 <div className="text-center py-12">
                   <Book className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                   <p className="text-muted-foreground">O diário está em branco.</p>
                 </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!viewMilestone} onOpenChange={(open) => !open && setViewMilestone(null)}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          {viewMilestone && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{viewMilestone.title}</DialogTitle>
                <DialogDescription>
                  {format(parseISO(viewMilestone.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </DialogDescription>
              </DialogHeader>
              
              {viewMilestone.photoUrl && (
                <img 
                  src={viewMilestone.photoUrl} 
                  alt={viewMilestone.title}
                  className="w-full rounded-xl object-cover max-h-64"
                />
              )}
              
              <p className="text-foreground leading-relaxed">{viewMilestone.description}</p>
              
              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingMilestone(viewMilestone);
                    setViewMilestone(null);
                  }}
                  data-testid="button-edit-milestone"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Editar
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => setDeleteConfirm(viewMilestone)}
                  data-testid="button-delete-milestone"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMilestone} onOpenChange={(open) => {
        if (!open) {
          setEditingMilestone(null);
          setMilestoneImage(null);
          editForm.reset();
        }
      }}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Editar Marco</DialogTitle>
            <DialogDescription>Atualize as informações deste momento especial</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" {...editForm.register("date")} />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input {...editForm.register("title")} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea {...editForm.register("description")} />
            </div>
            
            <div className="space-y-2">
              <Label>Foto do momento</Label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="edit-photo-input"
              />
              {milestoneImage ? (
                <div className="relative">
                  <img 
                    src={milestoneImage} 
                    alt="Preview" 
                    className="w-full h-40 object-cover rounded-xl border border-border"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => setMilestoneImage(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed flex flex-col gap-2"
                  onClick={() => document.getElementById("edit-photo-input")?.click()}
                >
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Adicionar foto</span>
                </Button>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={updateMilestone.isPending}>
              {updateMilestone.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Excluir Marco?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm?.title}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMilestone.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMilestone.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
