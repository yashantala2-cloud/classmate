import { reconstructRows, extractRollNamePairsFromRows, type PositionedWord } from './tableExtract'

/** Extracts every word from every page of a PDF, in visual reading order (flattened, no row boundaries). */
export async function extractPdfTokens(file: File): Promise<string[]> {
  const rows = await extractPdfRows(file)
  return rows.flat()
}

/** Extracts every page of a PDF as visual rows (top to bottom, left to right within a row). */
export async function extractPdfRows(file: File): Promise<string[][]> {
  // pdfjs-dist is ~1.2MB — load it only when a PDF is actually uploaded.
  const [pdfjsLib, { default: pdfjsWorker }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

  const buf = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buf }).promise

  const allRows: string[][] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()

    const words: PositionedWord[] = []
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      words.push({ text: item.str, x: item.transform[4], y: item.transform[5] })
    }
    allRows.push(...reconstructRows(words))
  }
  return allRows
}

/**
 * Best-effort roll/name pairs for roster PDFs. The result is always meant to
 * be corrected in the review grid, not trusted blindly.
 */
export function extractRollNamePairs(rows: string[][]): { rollNo: string; name: string }[] {
  return extractRollNamePairsFromRows(rows)
}
