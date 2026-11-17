import { type jsPDF } from 'jspdf';
import { EDUKYNE_LOGO_BASE64 } from './watermarkImage';

let cachedLogoImage: HTMLImageElement | null = null;

if (typeof window !== 'undefined') {
  cachedLogoImage = new Image();
  cachedLogoImage.src = EDUKYNE_LOGO_BASE64;
}

/**
 * Adiciona o fundo padrão aos relatórios PDF da EDUKYNE com a imagem da logo como marca d'água.
 * @param doc Instância do jsPDF
 */
export const addReportBackground = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Função para criar o watermark via Canvas
  const createWatermark = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Tenta desenhar a imagem da logo EDUKYNE se estiver carregada, senão usa texto fallback
    if (cachedLogoImage && cachedLogoImage.complete && cachedLogoImage.naturalWidth !== 0) {
      ctx.save();
      ctx.globalAlpha = 0.08; // Marca d'água sutil e elegante
      const imgWidth = 600;
      const imgHeight = 600;
      const x = (canvas.width - imgWidth) / 2;
      const y = (canvas.height - imgHeight) / 2;
      ctx.drawImage(cachedLogoImage, x, y, imgWidth, imgHeight);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 150px Arial';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)'; // Cor azul claro EDUKYNE com transparência
      ctx.fillText('EDUKYNE', 0, 0);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  };

  try {
    const watermarkData = createWatermark();
    if (watermarkData) {
      doc.addImage(watermarkData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    }
  } catch (e) {
    console.error('Erro ao adicionar fundo ao PDF:', e);
  }
};
