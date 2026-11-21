import type { jsPDF } from 'jspdf';

const FONT_FILES = {
  normal: '/fonts/NotoSans-Regular.ttf',
  bold: '/fonts/NotoSans-Bold.ttf',
} as const;

type FontStyle = keyof typeof FONT_FILES;

const cache: Partial<Record<FontStyle, string>> = {};
let loading: Promise<void> | null = null;

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const loadFonts = async (): Promise<void> => {
  if (loading) return loading;
  loading = (async () => {
    await Promise.all((Object.keys(FONT_FILES) as FontStyle[]).map(async style => {
      const response = await fetch(FONT_FILES[style]);
      if (!response.ok) throw new Error(`Falha ao carregar fonte PDF: ${FONT_FILES[style]}`);
      cache[style] = toBase64(await response.arrayBuffer());
    }));
  })();
  try {
    await loading;
  } catch (error) {
    loading = null;
    console.warn('[Edukyne] fonte Unicode indisponível; PDF usará fonte padrão.', error);
  }
};

export async function setupPdfFont(doc: jsPDF): Promise<void> {
  await loadFonts();
  (Object.keys(FONT_FILES) as FontStyle[]).forEach(style => {
    const data = cache[style];
    if (!data) return;
    const fileName = FONT_FILES[style].split('/').pop() ?? `NotoSans-${style}.ttf`;
    doc.addFileToVFS(fileName, data);
    doc.addFont(fileName, 'helvetica', style === 'bold' ? 'bold' : 'normal');
  });
  doc.setFont('helvetica', 'normal');
}
