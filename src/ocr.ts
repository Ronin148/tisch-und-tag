export async function compressPhoto(file: File): Promise<string> {
  const heic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!heic && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Bitte ein JPG-, PNG-, WebP- oder HEIC-Foto wählen.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Das Foto ist zu gross. Bitte ein Bild unter 15 MB wählen.');
  let url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url;
    try { await img.decode(); } catch {
      if (!heic) throw new Error('Das Foto konnte nicht geöffnet werden. Bitte ein anderes Bild wählen.');
      try {
        const { default: heic2any } = await import('heic2any');
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        URL.revokeObjectURL(url); url = URL.createObjectURL(Array.isArray(converted) ? converted[0] : converted);
        img.src = url; await img.decode();
      } catch { throw new Error('Dieses HEIC-Foto konnte nicht umgewandelt werden. Bitte über die Fotomediathek auswählen oder als JPG verwenden.'); }
    }
    const scale = Math.min(1, 2200 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Das Bild konnte nicht geöffnet werden.');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}

export async function recognizePhotos(photos: string[], onProgress: (label: string, progress: number) => void, signal: AbortSignal): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  let page = 0;
  onProgress('Texterkennung wird geladen …', 0);
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, location.origin).href;
  const worker = await createWorker('deu', 1, {
    workerPath: `${base}worker.min.js`, corePath: base, langPath: base,
    logger: m => { if (!signal.aborted) onProgress(m.status === 'recognizing text' ? `Foto ${page + 1} von ${photos.length} wird gelesen …` : 'Texterkennung wird vorbereitet …', (page + (m.status === 'recognizing text' ? m.progress : 0)) / photos.length); },
  });
  const abort = () => { void worker.terminate(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const texts: string[] = [];
    for (page = 0; page < photos.length; page++) {
      if (signal.aborted) throw new DOMException('Abgebrochen', 'AbortError');
      const result = await worker.recognize(photos[page]); texts.push(result.data.text);
    }
    return texts.join('\n\n');
  } finally { signal.removeEventListener('abort', abort); await worker.terminate(); }
}
