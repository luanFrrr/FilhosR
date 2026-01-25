import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateChild } from "@/hooks/use-children";
import { useChildContext } from "@/hooks/use-child-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Baby, ArrowRight, Heart } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const createChild = useCreateChild();
  const { setActiveChildId } = useChildContext();
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      theme: 'neutral'
    }
  });

  const selectedTheme = watch("theme");

  const onSubmit = (data: any) => {
    createChild.mutate({
      ...data,
      gender: data.gender || 'unspecified',
      initialWeight: data.initialWeight?.toString(),
      initialHeight: data.initialHeight?.toString(),
    }, {
      onSuccess: (child) => {
        setActiveChildId(child.id);
        toast({ title: "Bem-vindo(a)!", description: "Perfil criado com sucesso." });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "Erro ao criar perfil", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
             <Heart className="w-8 h-8 fill-current" />
           </div>
           <h2 className="text-3xl font-display font-bold text-foreground">Vamos começar!</h2>
           <p className="mt-2 text-muted-foreground">Crie o perfil do seu pequeno para acompanharmos essa jornada juntos.</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-border/50">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Criança</Label>
              <Input id="name" {...register("name", { required: true })} className="input-field" placeholder="Ex: Miguel" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input id="birthDate" type="date" {...register("birthDate", { required: true })} className="input-field" />
            </div>

            <div className="space-y-2">
              <Label>Tema Visual</Label>
              <RadioGroup 
                defaultValue="neutral" 
                className="flex gap-4" 
                onValueChange={(val) => setValue("theme", val)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="neutral" id="neutral" />
                  <Label htmlFor="neutral" className="cursor-pointer">Neutro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="blue" id="blue" className="text-blue-500 border-blue-500" />
                  <Label htmlFor="blue" className="cursor-pointer text-blue-600">Azul</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pink" id="pink" className="text-pink-500 border-pink-500" />
                  <Label htmlFor="pink" className="cursor-pointer text-pink-600">Rosa</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Peso ao nascer (kg)</Label>
                 <Input type="number" step="0.01" {...register("initialWeight")} className="input-field" placeholder="0.00" />
               </div>
               <div className="space-y-2">
                 <Label>Altura ao nascer (cm)</Label>
                 <Input type="number" step="0.1" {...register("initialHeight")} className="input-field" placeholder="00.0" />
               </div>
            </div>

            <Button type="submit" className="w-full btn-primary h-12 text-lg mt-4" disabled={createChild.isPending}>
              {createChild.isPending ? "Criando..." : "Criar Perfil"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
