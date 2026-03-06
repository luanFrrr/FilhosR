import { useState, useEffect, useCallback } from "react";
import { Camera, Bell, ImagePlus, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const PERMISSIONS_COMPLETED_KEY = "filhos_permissions_completed_v1";

interface PermissionState {
  camera: "prompt" | "granted" | "denied" | "unsupported";
  notifications: "prompt" | "granted" | "denied" | "unsupported";
}

export function PermissionPrompt() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [permissions, setPermissions] = useState<PermissionState>({
    camera: "prompt",
    notifications: "prompt",
  });
  const { subscribe, isSupported: pushSupported } = usePushNotifications();

  useEffect(() => {
    const completed = localStorage.getItem(PERMISSIONS_COMPLETED_KEY);
    if (completed) return;

    const timer = setTimeout(async () => {
      await checkCurrentPermissions();
      setShow(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const checkCurrentPermissions = async () => {
    const state: PermissionState = {
      camera: "prompt",
      notifications: "prompt",
    };

    try {
      if (navigator.permissions) {
        const cam = await navigator.permissions.query({ name: "camera" as PermissionName });
        state.camera = cam.state === "granted" ? "granted" : cam.state === "denied" ? "denied" : "prompt";
      }
    } catch {
      state.camera = "prompt";
    }

    if ("Notification" in window) {
      state.notifications = Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "prompt";
    } else {
      state.notifications = "unsupported";
    }

    setPermissions(state);

    let startStep = 0;
    if (state.camera === "granted" || state.camera === "denied") startStep = 1;
    if (startStep === 1 && (state.notifications === "granted" || state.notifications === "denied" || state.notifications === "unsupported")) {
      localStorage.setItem(PERMISSIONS_COMPLETED_KEY, String(Date.now()));
      setShow(false);
      return;
    }
    setStep(startStep);
  };

  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissions((p) => ({ ...p, camera: "granted" }));
    } catch {
      setPermissions((p) => ({ ...p, camera: "denied" }));
    }
    setStep(1);
  }, []);

  const requestNotifications = useCallback(async () => {
    if (!pushSupported) {
      setPermissions((p) => ({ ...p, notifications: "unsupported" }));
      finish();
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermissions((p) => ({ ...p, notifications: result === "granted" ? "granted" : "denied" }));
      if (result === "granted") {
        await subscribe();
      }
    } catch {
      setPermissions((p) => ({ ...p, notifications: "denied" }));
    }
    finish();
  }, [pushSupported, subscribe]);

  const finish = useCallback(() => {
    localStorage.setItem(PERMISSIONS_COMPLETED_KEY, String(Date.now()));
    setTimeout(() => setShow(false), 600);
    setStep(2);
  }, []);

  const skipAll = useCallback(() => {
    localStorage.setItem(PERMISSIONS_COMPLETED_KEY, String(Date.now()));
    setShow(false);
  }, []);

  if (!show) return null;

  const permissionItems = [
    {
      icon: Camera,
      title: "Câmera e Galeria",
      description: "Para registrar fotos diárias, marcos e perfil da criança",
      status: permissions.camera,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Bell,
      title: "Notificações",
      description: "Lembretes de vacinas e atividades da família",
      status: permissions.notifications,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl overflow-hidden"
          >
            <div className="p-6 pb-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-center text-foreground">
                {step < 2 ? "Permissões do app" : "Tudo pronto!"}
              </h2>
              <p className="text-sm text-muted-foreground text-center mt-1">
                {step < 2
                  ? "Para funcionar melhor, o Filhos precisa de algumas permissões"
                  : "Agora você pode aproveitar todas as funcionalidades"}
              </p>
            </div>

            <div className="px-6 pb-4 space-y-3">
              {permissionItems.map((item, idx) => {
                const isGranted = item.status === "granted";
                const isCurrent = idx === step && step < 2;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isCurrent
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted/30 border border-transparent"
                    }`}
                    data-testid={`permission-item-${idx}`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center shrink-0`}>
                      {isGranted ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isGranted ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                        {item.title}
                        {isGranted && " ativado"}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    {isGranted && (
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-6 pt-2 space-y-2">
              {step === 0 && (
                <Button
                  className="w-full h-12 rounded-xl font-semibold gap-2"
                  onClick={requestCamera}
                  data-testid="button-request-camera"
                >
                  <Camera className="w-4 h-4" />
                  Permitir Câmera e Galeria
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              )}
              {step === 1 && (
                <Button
                  className="w-full h-12 rounded-xl font-semibold gap-2"
                  onClick={requestNotifications}
                  data-testid="button-request-notifications"
                >
                  <Bell className="w-4 h-4" />
                  Permitir Notificações
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              )}
              {step === 2 && (
                <Button
                  className="w-full h-12 rounded-xl font-semibold gap-2"
                  onClick={() => setShow(false)}
                  data-testid="button-permissions-done"
                >
                  <Check className="w-4 h-4" />
                  Começar a usar
                </Button>
              )}
              {step < 2 && (
                <Button
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground"
                  onClick={step === 0 ? () => setStep(1) : finish}
                  data-testid="button-skip-permission"
                >
                  Pular
                </Button>
              )}
              {step === 0 && (
                <button
                  className="w-full text-xs text-muted-foreground/60 mt-1"
                  onClick={skipAll}
                  data-testid="button-skip-all-permissions"
                >
                  Configurar depois em Ajustes
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
