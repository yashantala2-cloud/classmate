import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, 'icon-source.svg')
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const t of targets) {
  await sharp(src).resize(t.size, t.size).png().toFile(join(outDir, t.file))
  console.log('wrote', t.file)
}

// Maskable icon needs safe-zone padding (~20%) since OS applies its own mask crop.
await sharp(src)
  .resize(300, 300)
  .extend({ top: 106, bottom: 106, left: 106, right: 106, background: '#0B2540' })
  .png()
  .toFile(join(outDir, 'icon-maskable-512.png'))
console.log('wrote icon-maskable-512.png')

await sharp(join(__dirname, '..', 'public', 'favicon.svg')).resize(32, 32).png().toFile(join(outDir, 'favicon-32.png')).catch(() => {})
