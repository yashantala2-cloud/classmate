import { extractRollNamePairsFromRows } from './tableExtract'

/** Flattens every non-empty cell of the first sheet, in row-major reading order. */
export async function extractExcelTokens(file: File): Promise<string[]> {
  // xlsx (SheetJS) is loaded on demand — only needed when a spreadsheet is uploaded.
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, blankrows: false })

  const tokens: string[] = []
  for (const row of rows) {
    for (const cell of row) {
      if (cell === undefined || cell === null || cell === '') continue
      String(cell)
        .trim()
        .split(/\s+/)
        .forEach((piece) => piece && tokens.push(piece))
    }
  }
  return tokens
}

/** Best-effort roll/name pairs from a roster spreadsheet — same name-anchored heuristic as PDF rows. */
export async function extractRollNamePairsFromExcel(
  file: File,
): Promise<{ rollNo: string; name: string }[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, blankrows: false })

  const cellRows = rows.map((row) =>
    row
      .filter((c) => c !== undefined && c !== null && String(c).trim() !== '')
      .flatMap((c) => String(c).trim().split(/\s+/)),
  )
  return extractRollNamePairsFromRows(cellRows)
}
