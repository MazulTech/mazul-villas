// Capa sobre IndexedDB para trabajar sin señal. No usa librerías externas
// para no depender de instalar nada nuevo. Dos cosas viven aquí:
//
// 1. Cache de lecturas: la última respuesta buena de listas (villas,
//    mejoras, inventario) para poder mostrar algo aunque no haya señal.
// 2. Cola de pendientes: acciones que el usuario hizo sin conexión (crear
//    una tarea de mejora, marcar una como resuelta) para mandarlas en
//    cuanto regrese la señal. Ver src/lib/sync.ts.

const DB_NOMBRE = "mazul-offline";
const DB_VERSION = 1;
const TIENDA_CACHE = "cache";
const TIENDA_COLA = "cola";

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TIENDA_CACHE)) {
        db.createObjectStore(TIENDA_CACHE);
      }
      if (!db.objectStoreNames.contains(TIENDA_COLA)) {
        db.createObjectStore(TIENDA_COLA, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("No se pudo abrir la base local"));
  });
}

async function guardarEnCache<T>(clave: string, valor: T): Promise<void> {
  try {
    const db = await abrirDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TIENDA_CACHE, "readwrite");
      tx.objectStore(TIENDA_CACHE).put(valor, clave);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // si falla el cache local no es crítico, simplemente no se guarda
  }
}

async function leerDeCache<T>(clave: string): Promise<T | undefined> {
  try {
    const db = await abrirDb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(TIENDA_CACHE, "readonly");
      const req = tx.objectStore(TIENDA_CACHE).get(clave);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

// Intenta cargar datos frescos con `cargar`; si funciona, los deja
// guardados para la próxima vez que no haya señal. Si falla (sin señal,
// error de red), regresa lo último que se guardó, si hay algo. Si no hay
// nada guardado tampoco, deja que el error original se propague.
export async function conCache<T>(
  clave: string,
  cargar: () => Promise<T>
): Promise<{ datos: T; deCache: boolean }> {
  try {
    const datos = await cargar();
    void guardarEnCache(clave, datos);
    return { datos, deCache: false };
  } catch (e) {
    const datosCache = await leerDeCache<T>(clave);
    if (datosCache !== undefined) {
      return { datos: datosCache, deCache: true };
    }
    throw e;
  }
}

// --- Cola de acciones pendientes por sincronizar ---

export type TipoAccionPendiente = "crear_mejora" | "marcar_resuelta";

export interface AccionPendiente {
  id: string;
  tipo: TipoAccionPendiente;
  creadoEn: string;
  // Datos de la acción; la forma exacta depende de `tipo` (ver sync.ts).
  payload: Record<string, unknown>;
  // Foto asociada, si aplica — se sube a Supabase al sincronizar.
  foto?: Blob;
  fotoNombre?: string;
  estado: "pendiente" | "error";
  error?: string;
}

export async function encolarAccion(
  accion: Omit<AccionPendiente, "id" | "creadoEn" | "estado">
): Promise<string> {
  const db = await abrirDb();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const item: AccionPendiente = { ...accion, id, creadoEn: new Date().toISOString(), estado: "pendiente" };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TIENDA_COLA, "readwrite");
    tx.objectStore(TIENDA_COLA).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new Event("mazul-cola-cambio"));
  return id;
}

export async function listarCola(): Promise<AccionPendiente[]> {
  try {
    const db = await abrirDb();
    return await new Promise<AccionPendiente[]>((resolve, reject) => {
      const tx = db.transaction(TIENDA_COLA, "readonly");
      const req = tx.objectStore(TIENDA_COLA).getAll();
      req.onsuccess = () => resolve((req.result as AccionPendiente[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function quitarDeCola(id: string): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TIENDA_COLA, "readwrite");
    tx.objectStore(TIENDA_COLA).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new Event("mazul-cola-cambio"));
}

export async function actualizarEnCola(id: string, cambios: Partial<AccionPendiente>): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TIENDA_COLA, "readwrite");
    const store = tx.objectStore(TIENDA_COLA);
    const req = store.get(id);
    req.onsuccess = () => {
      const actual = req.result as AccionPendiente | undefined;
      if (actual) store.put({ ...actual, ...cambios });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new Event("mazul-cola-cambio"));
}
