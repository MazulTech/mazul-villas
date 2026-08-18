import { useEffect, useState } from "react";
import { crearMejora, marcarMejoraResuelta, type NuevaMejoraInput } from "./data";
import { subirFoto } from "./storage";
import { mensajeError } from "./errores";
import { actualizarEnCola, listarCola, quitarDeCola, type AccionPendiente } from "./offlineDb";

// true/false según si el celular tiene señal ahora mismo. Se actualiza solo
// con los eventos "online"/"offline" del navegador.
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const marcarOnline = () => setOnline(true);
    const marcarOffline = () => setOnline(false);
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);
    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
    };
  }, []);
  return online;
}

// Lista de acciones pendientes por sincronizar (crear tarea, marcar
// resuelta...). Se refresca sola cuando la cola cambia.
export function usePendientes(): AccionPendiente[] {
  const [pendientes, setPendientes] = useState<AccionPendiente[]>([]);
  useEffect(() => {
    let vivo = true;
    const refrescar = () => {
      listarCola().then((cola) => {
        if (vivo) setPendientes(cola);
      });
    };
    refrescar();
    window.addEventListener("mazul-cola-cambio", refrescar);
    return () => {
      vivo = false;
      window.removeEventListener("mazul-cola-cambio", refrescar);
    };
  }, []);
  return pendientes;
}

let sincronizando = false;

async function procesarAccion(item: AccionPendiente): Promise<void> {
  if (item.tipo === "crear_mejora") {
    // La foto puede venir ya subida (p. ej. se tomó con señal y justo
    // después se perdió antes de tocar "Guardar", o viene de un item de
    // inventario que ya tenía foto) o como Blob pendiente de subir.
    const input = item.payload as unknown as Partial<NuevaMejoraInput>;
    let fotoAntesUrl = input.fotoAntesUrl;
    if (!fotoAntesUrl) {
      if (!item.foto) throw new Error("Falta la foto, no se puede subir esta tarea.");
      const archivo = new File([item.foto], item.fotoNombre || "foto.jpg", {
        type: item.foto.type || "image/jpeg",
      });
      fotoAntesUrl = await subirFoto(archivo, `mejoras/${input.villaId || "sin-villa"}`);
    }
    await crearMejora({ ...input, fotoAntesUrl } as NuevaMejoraInput);
    return;
  }
  if (item.tipo === "marcar_resuelta") {
    const { id, villaId, fotoDespuesUrl: fotoYaSubida } = item.payload as {
      id: string;
      villaId?: string;
      fotoDespuesUrl?: string;
    };
    let fotoDespuesUrl = fotoYaSubida;
    if (!fotoDespuesUrl) {
      if (!item.foto) throw new Error("Falta la foto, no se puede subir esta tarea.");
      const archivo = new File([item.foto], item.fotoNombre || "foto.jpg", {
        type: item.foto.type || "image/jpeg",
      });
      fotoDespuesUrl = await subirFoto(archivo, `mejoras/${villaId || "sin-villa"}`);
    }
    await marcarMejoraResuelta(id, fotoDespuesUrl);
    return;
  }
}

// Procesa la cola en orden. Si una acción falla, se marca con el error y se
// sigue con las demás — una tarea con problema no debe trabar el resto.
export async function sincronizarPendientes(): Promise<void> {
  if (sincronizando) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  sincronizando = true;
  try {
    const cola = await listarCola();
    for (const item of cola) {
      try {
        await procesarAccion(item);
        await quitarDeCola(item.id);
      } catch (e) {
        await actualizarEnCola(item.id, {
          estado: "error",
          error: mensajeError(e, "No se pudo sincronizar."),
        });
      }
    }
  } finally {
    sincronizando = false;
  }
}

// Se llama una vez al iniciar la app: sincroniza de inmediato si ya hay
// señal (por si quedaron pendientes de una sesión anterior), y de ahí en
// adelante cada vez que el celular recupera la señal.
export function iniciarSincronizacionAutomatica(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    void sincronizarPendientes();
  });
  if (navigator.onLine) {
    void sincronizarPendientes();
  }
}
