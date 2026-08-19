import { reconstructReadingOrder, type PositionedWord } from './tableExtract'

const BASE = import.meta.env.BASE_URL

export interface OcrProgress {
  status: string
  progress: number
}

/** Runs on-device OCR over a photo of a marks sheet and returns tokens in reading order. */
export async function extractImageTokens(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<string[]> {
  // tesseract.js pulls in a large runtime — load it only when a photo is uploaded.
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    workerPath: `${BASE}tesseract/worker.min.js`,
    corePath: `${BASE}tesseract/tesseract-core-simd-lstm.wasm.js`,
    langPath: `${BASE}tessdata`,
    logger: (m) => onProgress?.({ status: m.status, progress: m.progress }),
  })

  try {
    const preprocessed = await preprocessForOcr(file)
    // Marks sheets are dense grids with no paragraph structure — SPARSE_TEXT
    // asks tesseract to find text anywhere on the page in any order, rather
    // than trying (and failing) to build columns/paragraphs out of a grid.
    // Row/column order is reconstructed ourselves from word bounding boxes
    // afterward, so tesseract's own reading order doesn't matter here.
    // PSM is a type-only export (the package has no runtime enum) — '11' is its SPARSE_TEXT value.
    await worker.setParameters({ tessedit_pageseg_mode: '11' as unknown as Tesseract.PSM })
    // `blocks: true` is required — without it tesseract.js returns only flat
    // text and no bounding-box structure, regardless of image quality.
    const { data } = await worker.recognize(preprocessed, {}, { blocks: true })

    // Page has no flat `words` list — words nest under blocks > paragraphs > lines > words.
    const words: PositionedWord[] = []
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          for (const w of line.words) {
            words.push({ text: w.text, x: w.bbox.x0, y: -w.bbox.y0 })
          }
        }
      }
    }
    return reconstructReadingOrder(words)
  } finally {
    await worker.terminate()
  }
}

/** Grayscale + contrast boost — cheap, well-known accuracy win for OCR on phone photos of printed pages. */
async function preprocessForOcr(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data
  const CONTRAST = 1.3
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const contrasted = Math.min(255, Math.max(0, (gray - 128) * CONTRAST + 128))
    d[i] = d[i + 1] = d[i + 2] = contrasted
  }
  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))), 'image/png')
  })
}
