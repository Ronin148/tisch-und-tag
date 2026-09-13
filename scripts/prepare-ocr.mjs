import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve('public/ocr');
await mkdir(out, { recursive: true });
await copyFile('node_modules/tesseract.js/dist/worker.min.js', `${out}/worker.min.js`);
for (const file of await readdir('node_modules/tesseract.js-core')) {
  if (/^tesseract-core.*\.(js|wasm)$/.test(file)) await copyFile(`node_modules/tesseract.js-core/${file}`, `${out}/${file}`);
}
await copyFile('node_modules/@tesseract.js-data/deu/4.0.0_best_int/deu.traineddata.gz', `${out}/deu.traineddata.gz`);
console.log('Deutsche Texterkennung bereit. Fotos werden lokal im Browser verarbeitet.');
