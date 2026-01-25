import { useState, useRef } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useMilestones, useCreateMilestone, useDiary, useCreateDiaryEntry } from "@/hooks/use-memories";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star, Book, Image as ImageIcon, Camera, X, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageUtils";

export default function Memories() {
  const { activeChild } = useChildContext();
  const { data: milestones } = useMilestones(activeChild?.id || 0);
  const { data: diary } = useDiary(activeChild?.id || 0);
  const createMilestone = useCreateMilestone();
  const createDiary = useCreateDiaryEntry();
  const { toast } = useToast();
  const [openMilestone, setOpenMilestone] = useState(false);
  const [openDiary, setOpenDiary] = useState(false);
  const [milestoneImage, setMilestoneImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const milestoneForm = useForm();
  const diaryForm = useForm();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: "Escolha uma imagem menor que 15MB", variant: "destructive" });
        return;
      }
      try {
        const compressedImage = await compressImage(file, 1200, 0.8);
        setMilestoneImage(compressedImage);
      } catch {
        toast({ title: "Erro ao processar imagem", variant: "destructive" });
      }
    }
  };

  const onSubmitMilestone = (data: any) => {
    if (!activeChild) return;
    createMilestone.mutate({ 
      childId: activeChild.id, 
      ...data,
      photoUrl: milestoneImage || null
    }, {
      onSuccess: () => {
        setOpenMilestone(false);
        milestoneForm.reset();
        setMilestoneImage(null);
        toast({ title: "Marco registrado!" });
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
            <div className="mb-6 flex justify-end">
               <Dialog open={openMilestone} onOpenChange={(open) => {
                 setOpenMilestone(open);
                 if (!open) {
                   setMilestoneImage(null);
                   milestoneForm.reset();
                 }
               }}>
                 <DialogTrigger asChild>
                   <Button className="rounded-full" data-testid="button-new-milestone">+ Novo Marco</Button>
                 </DialogTrigger>
                 <DialogContent className="rounded-2xl max-w-sm mx-auto">
                   <DialogHeader>
                     <DialogTitle>Conquista Desbloqueada!</DialogTitle>
                     <DialogDescription>Registre um momento especial na vida do seu filho</DialogDescription>
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
                       {createMilestone.isPending ? "Salvando..." : "Salvar Conquista"}
                     </Button>
                   </form>
                 </DialogContent>
               </Dialog>
            </div>

            <div className="relative border-l-2 border-primary/20 ml-4 space-y-8 pb-8">
               {milestones?.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((milestone) => (
                 <div key={milestone.id} className="relative pl-6">
                   <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                   <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">
                     {format(new Date(milestone.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                   </span>
                   <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                     {milestone.photoUrl && (
                       <img 
                         src={milestone.photoUrl} 
                         alt={milestone.title} 
                         className="w-full h-32 object-cover rounded-lg mb-3"
                       />
                     )}
                     <h3 className="font-display font-bold text-lg mb-2">{milestone.title}</h3>
                     <p className="text-muted-foreground text-sm leading-relaxed">{milestone.description}</p>
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
                       {format(new Date(entry.date), "dd/MM/yyyy")}
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
    </div>
  );
}
