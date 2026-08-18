import { jsPDF } from "jspdf";
import type { InventarioItem } from "../types";

const LABEL_CONDICION: Record<string, string> = {
  bueno: "Bueno",
  regular: "Regular",
  danado: "Dañado",
};

// Descarga una foto y la deja lista para meterla en el PDF (jsPDF necesita
// la imagen como data URL, no como link). Si falla (sin señal, CORS, la
// URL ya no existe...) regresa null y el reporte se genera igual, nada más
// sin esa foto — nunca se debe bloquear la descarga por una imagen.
async function imagenComoDataUrl(url: string): Promise<{ dataUrl: string; formato: "JPEG" | "PNG" } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const formato = blob.type.includes("png") ? "PNG" : "JPEG";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result as string);
      lector.onerror = () => reject(lector.error);
      lector.readAsDataURL(blob);
    });
    return { dataUrl, formato };
  } catch {
    return null;
  }
}

export interface DatosReporteInventario {
  nombreVilla: string;
  items: InventarioItem[];
}

// Genera el PDF directamente en el celular y lo descarga (jsPDF, sin pasar
// por el diálogo de impresión del navegador). Esto es a propósito: cuando
// la app está instalada como app (modo standalone, "agregar a inicio"),
// tanto iPhone como algunos Android no muestran el diálogo de imprimir —
// window.print() ahí simplemente no hace nada. Generar el archivo nosotros
// siempre funciona, esté la app instalada o no.
export async function generarPdfInventario({ nombreVilla, items }: DatosReporteInventario): Promise<void> {
  const fotos = await Promise.all(
    items.map((it) => (it.fotoUrl ? imagenComoDataUrl(it.fotoUrl) : Promise.resolve(null)))
  );

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margenX = 15;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const margenInferior = 15;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(nombreVilla, margenX, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 95, 80);
  const fecha = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Reporte de inventario · generado el ${fecha}`, margenX, y);
  doc.setDrawColor(233, 217, 195);
  doc.line(margenX, y + 4, anchoPagina - margenX, y + 4);
  y += 12;
  doc.setTextColor(20, 15, 10);

  if (items.length === 0) {
    doc.setFontSize(11);
    doc.text("Sin items registrados para esta villa.", margenX, y);
    doc.save(nombreArchivo(nombreVilla));
    return;
  }

  const altoFila = 22;
  const anchoImg = 16;

  items.forEach((it, i) => {
    if (y + altoFila > altoPagina - margenInferior) {
      doc.addPage();
      y = 20;
    }

    const foto = fotos[i];
    if (foto) {
      try {
        doc.addImage(foto.dataUrl, foto.formato, margenX, y, anchoImg, anchoImg);
      } catch {
        // formato de imagen no soportado u otro error puntual: se omite la
        // foto de este item y se sigue con el resto del reporte
      }
    }

    const xTexto = margenX + anchoImg + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(it.nombre, xTexto, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 95, 80);
    const condicion = LABEL_CONDICION[it.condicion] ?? it.condicion;
    const categoriaTexto = it.categoria ? `${it.categoria} · ` : "";
    doc.text(
      `${categoriaTexto}${it.zona} · Cantidad: ${it.cantidad} · ${condicion} · ${new Date(it.creadoEn).toLocaleDateString("es-MX")}`,
      xTexto,
      y + 12
    );
    doc.setTextColor(20, 15, 10);

    y += altoFila;
  });

  doc.save(nombreArchivo(nombreVilla));
}

function nombreArchivo(nombreVilla: string): string {
  const limpio = nombreVilla.replace(/[\\/:*?"<>|]/g, "-");
  return `Inventario ${limpio}.pdf`;
}
