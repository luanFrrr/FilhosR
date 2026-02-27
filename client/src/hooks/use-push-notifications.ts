import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSupport = async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setIsSupported(supported);

      if (!supported) {
        setIsLoading(false);
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const res = await fetch("/api/push/status", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            setIsSubscribed(data.subscribed);
          } else {
            setIsSubscribed(false);
          }
        } else {
          setIsSubscribed(false);
        }
      } catch {
        setIsSubscribed(false);
      }

      setIsLoading(false);
    };

    checkSupport();
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir notificações nas configurações do seu navegador/dispositivo.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const vapidRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await vapidRes.json();

      if (!publicKey) {
        toast({ title: "Erro", description: "Notificações push não configuradas no servidor.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = sub.toJSON();
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      });

      setIsSubscribed(true);
      toast({
        title: "Notificações ativadas!",
        description: "Você receberá lembretes quando as vacinas dos seus filhos estiverem próximas.",
      });
    } catch (error: any) {
      console.error("Push subscription failed:", error);
      toast({
        title: "Erro ao ativar notificações",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }, [toast]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await apiRequest("POST", "/api/push/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
      toast({ title: "Notificações desativadas" });
    } catch (error: any) {
      console.error("Push unsubscribe failed:", error);
      toast({ title: "Erro ao desativar", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  const sendTest = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/push/test");
      toast({ title: "Notificação de teste enviada!", description: "Deve chegar em alguns segundos." });
    } catch (error: any) {
      toast({ title: "Erro ao enviar teste", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  return { isSubscribed, isLoading, isSupported, subscribe, unsubscribe, sendTest };
}
