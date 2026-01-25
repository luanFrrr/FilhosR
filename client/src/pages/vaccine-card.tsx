import { useState, useRef } from "react";
import { useChildContext } from "@/hooks/use-child-context";
import { useSusVaccines, useVaccineRecords, useCreateVaccineRecord } from "@/hooks/use-vaccines";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Syringe, Plus, Check, Camera, X, ChevronRight, Shield } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SusVaccine } from "@shared/schema";

const doseOptions = [
  "Dose única",
  "Dose ao nascer",
  "1ª dose",
  "2ª dose",
  "3ª dose",
  "1º reforço",
  "2º reforço",
  "Reforço",
  "Dose inicial",
];

export default function VaccineCard() {
  const { activeChild } = useChildContext();
  const { data: susVaccines, isLoading: loadingVaccines } = useSusVaccines();
  const { data: vaccineRecords } = useVaccineRecords(activeChild?.id || 0);
  const createRecord = useCreateVaccineRecord();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [selectedVaccine, setSelectedVaccine] = useState<SusVaccine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      susVaccineId: "",
      dose: "",
      applicationDate: "",
      applicationPlace: "",
      notes: "",
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: "Escolha uma imagem menor que 5MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: any) => {
    if (!activeChild) return;
    
    createRecord.mutate({
      childId: activeChild.id,
      susVaccineId: parseInt(data.susVaccineId),
      dose: data.dose,
      applicationDate: data.applicationDate,
      applicationPlace: data.applicationPlace || null,
      notes: data.notes || null,
      photoUrls: photoUrls.length > 0 ? photoUrls : null,
    }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setPhotoUrls([]);
        setSelectedVaccine(null);
        toast({ title: "Vacina registrada!" });
      },
      onError: () => {
        toast({ title: "Erro ao registrar", variant: "destructive" });
      }
    });
  };

  const getVaccineName = (susVaccineId: number) => {
    return susVaccines?.find(v => v.id === susVaccineId)?.name || "Vacina";
  };

  const getVaccineInfo = (susVaccineId: number) => {
    return susVaccines?.find(v => v.id === susVaccineId);
  };

  const getRecordsForVaccine = (vaccineId: number) => {
    return vaccineRecords?.filter(r => r.susVaccineId === vaccineId) || [];
  };

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Carteira Vacinal" showChildSelector={false} />
        <div className="flex items-center justify-center p-6 text-center">
          <p className="text-muted-foreground">Selecione uma criança para ver a carteira vacinal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Carteira Vacinal" showChildSelector={false} />

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">{activeChild.name}</h2>
              <p className="text-sm text-muted-foreground">
                {vaccineRecords?.length || 0} vacinas registradas
              </p>
            </div>
          </div>
          
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              form.reset();
              setPhotoUrls([]);
              setSelectedVaccine(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full" data-testid="button-add-vaccine">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-primary" />
                  Registrar Vacina
                </DialogTitle>
                <DialogDescription>Registre uma vacina aplicada na criança</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Vacina</Label>
                  <Controller
                    name="susVaccineId"
                    control={form.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={(val) => {
                          field.onChange(val);
                          const vaccine = susVaccines?.find(v => v.id === parseInt(val));
                          setSelectedVaccine(vaccine || null);
                        }}
                      >
                        <SelectTrigger data-testid="select-vaccine">
                          <SelectValue placeholder="Selecione a vacina" />
                        </SelectTrigger>
                        <SelectContent>
                          {susVaccines?.map(vaccine => (
                            <SelectItem key={vaccine.id} value={String(vaccine.id)}>
                              {vaccine.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {selectedVaccine && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                      <p className="font-medium">Previne: {selectedVaccine.diseasesPrevented}</p>
                      <p>Idade: {selectedVaccine.ageRange}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Dose</Label>
                  <Controller
                    name="dose"
                    control={form.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-dose">
                          <SelectValue placeholder="Selecione a dose" />
                        </SelectTrigger>
                        <SelectContent>
                          {doseOptions.map(dose => (
                            <SelectItem key={dose} value={dose}>{dose}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Aplicação</Label>
                  <Input 
                    type="date" 
                    {...form.register("applicationDate", { required: true })} 
                    data-testid="input-application-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Local de Aplicação (opcional)</Label>
                  <Input 
                    placeholder="Ex: UBS Centro, Hospital Municipal..." 
                    {...form.register("applicationPlace")}
                    data-testid="input-application-place"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea 
                    placeholder="Reações, lote, profissional..." 
                    {...form.register("notes")}
                    data-testid="input-vaccine-notes"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fotos do comprovante (opcional)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="input-vaccine-photo"
                  />
                  
                  {photoUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {photoUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={url} 
                            alt={`Foto ${index + 1}`} 
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => removePhoto(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-add-photo"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Adicionar foto
                  </Button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createRecord.isPending}
                  data-testid="button-save-vaccine"
                >
                  {createRecord.isPending ? "Salvando..." : "Registrar Vacina"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingVaccines ? (
          <div className="text-center py-12 text-muted-foreground">Carregando vacinas...</div>
        ) : (
          <div className="space-y-3">
            {susVaccines?.map(vaccine => {
              const records = getRecordsForVaccine(vaccine.id);
              const hasRecords = records.length > 0;
              
              return (
                <div 
                  key={vaccine.id}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all",
                    hasRecords ? "border-green-200 bg-green-50/30" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {hasRecords && (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <h3 className="font-bold text-foreground">{vaccine.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {vaccine.diseasesPrevented}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Idade:</span> {vaccine.ageRange}
                      </p>
                      
                      {hasRecords && (
                        <div className="mt-3 space-y-2">
                          {records.map(record => (
                            <div key={record.id} className="flex items-center gap-2 text-sm bg-white rounded-lg p-2 border border-green-100">
                              <Syringe className="w-4 h-4 text-green-600" />
                              <span className="font-medium">{record.dose}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-muted-foreground">
                                {format(new Date(record.applicationDate), "dd/MM/yyyy")}
                              </span>
                              {record.photoUrls && record.photoUrls.length > 0 && (
                                <Camera className="w-3 h-3 text-muted-foreground ml-auto" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(!vaccineRecords || vaccineRecords.length === 0) && !loadingVaccines && (
          <div className="text-center py-8 mt-4 bg-muted/30 rounded-xl">
            <Syringe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhuma vacina registrada ainda.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Clique no + para adicionar a primeira vacina.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
