// Shared logic for turning positioned text tokens (from a PDF or OCR pass) into
// an ordered stream of words, then pairing "roll number" + "marks" tokens using
// the already-known class roster as ground truth. This sidesteps needing the
// PDF/photo table layout to be parsed perfectly — we already know which roll
// numbers to expect, so we just walk the token stream looking for them in order.

export interface PositionedWord {
  text: string
  x: number
  y: number
}

/**
 * Groups positioned words into visual rows (by y-coordinate clustering) and
 * sorts each row left-to-right — the reading order a human would use scanning
 * a table top to bottom, left to right per row. Row boundaries are kept
 * (rather than flattened) because roster columns like Sr.No/EnrollmentNo/
 * Semester also contain digits, and only row position reliably separates one
 * student's fields from the next.
 */
export function reconstructRows(words: PositionedWord[]): string[][] {
  if (words.length === 0) return []
  const sorted = [...words].sort((a, b) => b.y - a.y)
  const rowTolerance = medianWordHeight(sorted) * 0.6 || 4

  const rows: PositionedWord[][] = []
  let currentRow: PositionedWord[] = [sorted[0]]
  let rowY = sorted[0].y

  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i]
    if (Math.abs(w.y - rowY) <= rowTolerance) {
      currentRow.push(w)
    } else {
      rows.push(currentRow)
      currentRow = [w]
      rowY = w.y
    }
  }
  rows.push(currentRow)

  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x)
    const tokens: string[] = []
    for (const w of row) {
      for (const piece of w.text.trim().split(/\s+/)) {
        if (piece) tokens.push(piece)
      }
    }
    return tokens
  })
}

/** Flattens rows back into a single token stream, for callers that only need reading order (e.g. marks pairing). */
export function reconstructReadingOrder(words: PositionedWord[]): string[] {
  return reconstructRows(words).flat()
}

function medianWordHeight(words: PositionedWord[]): number {
  const ys = words.map((w) => w.y).sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < ys.length; i++) {
    const gap = Math.abs(ys[i] - ys[i - 1])
    if (gap > 0.5) gaps.push(gap)
  }
  if (gaps.length === 0) return 0
  gaps.sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)]
}

const MARKS_RE = /^\d{1,3}(\.\d+)?$/
const ABSENT_RE = /^ab$/i

/**
 * Scans a token stream for known roll numbers, treating the token immediately
 * following a recognized roll number as its marks value. Everything else
 * (headers, subject names, class-percentage tables, signatures) is ignored.
 */
export function pairRollsWithMarks(
  tokens: string[],
  expectedRolls: string[],
): Map<string, string> {
  const rollSet = new Set(expectedRolls)
  const result = new Map<string, string>()

  for (let i = 0; i < tokens.length - 1; i++) {
    const tok = normalizeRoll(tokens[i])
    if (!tok || !rollSet.has(tok) || result.has(tok)) continue
    const next = tokens[i + 1].trim().replace(/,$/, '')
    if (MARKS_RE.test(next) || ABSENT_RE.test(next)) {
      result.set(tok, ABSENT_RE.test(next) ? 'AB' : next)
      i += 1
    }
  }
  return result
}

function normalizeRoll(raw: string): string | null {
  const cleaned = raw.trim().replace(/[.,:]$/, '')
  return /^\d{1,4}$/.test(cleaned) ? String(Number(cleaned)) : null
}

const PURE_NAME_WORD_RE = /^[A-Za-z][A-Za-z.'-]*$/
const ROLL_RE = /^\d{1,4}$/

/**
 * Pulls {rollNo, name} pairs out of table rows that often carry extra columns
 * (Sr.No, enrollment number, program, semester, division, lab batch — as real
 * college roster exports do, sometimes with the roll number duplicated inside
 * the same cell as the name). The heuristic keys off the *name*, not the
 * roll: find the run of pure-alphabetic words (a name never contains digits,
 * unlike enrollment numbers), then take the digit token immediately adjacent
 * to it as the roll number — ignoring any other digit columns (Sr.No,
 * semester, ...) elsewhere in the row. Tried in both roll-before-name and
 * name-before-roll orientations; whichever finds more plausible rows wins.
 * Always meant to be corrected in a review grid, not trusted blindly.
 */
export function extractRollNamePairsFromRows(rows: string[][]): { rollNo: string; name: string }[] {
  const rollFirst: { rollNo: string; name: string }[] = []
  const nameFirst: { rollNo: string; name: string }[] = []

  for (const row of rows) {
    const nameStart = row.findIndex((t) => PURE_NAME_WORD_RE.test(t))
    if (nameStart > 0 && ROLL_RE.test(row[nameStart - 1])) {
      const nameParts: string[] = []
      for (let i = nameStart; i < row.length; i++) {
        if (!PURE_NAME_WORD_RE.test(row[i])) break
        nameParts.push(row[i])
      }
      rollFirst.push({ rollNo: row[nameStart - 1], name: nameParts.join(' ') })
    }

    for (let i = row.length - 1; i >= 1; i--) {
      if (ROLL_RE.test(row[i]) && PURE_NAME_WORD_RE.test(row[i - 1])) {
        const nameParts: string[] = []
        let j = i - 1
        while (j >= 0 && PURE_NAME_WORD_RE.test(row[j])) {
          nameParts.unshift(row[j])
          j -= 1
        }
        nameFirst.push({ rollNo: row[i], name: nameParts.join(' ') })
        break
      }
    }
  }

  // Raw match count is an unreliable tiebreak: a stray column (e.g. every row's
  // "Semester" cell) can spuriously match the wrong orientation about as often
  // as real rows match the right one. Distinct roll numbers is a much stronger
  // signal — a real roster has ~one unique roll per row, while a false-positive
  // column (like a repeated "5") collapses to a handful of unique values.
  const uniqueRolls = (pairs: { rollNo: string; name: string }[]) => new Set(pairs.map((p) => p.rollNo)).size
  return uniqueRolls(rollFirst) >= uniqueRolls(nameFirst) ? rollFirst : nameFirst
}
