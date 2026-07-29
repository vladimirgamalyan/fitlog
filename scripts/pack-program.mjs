#!/usr/bin/env node
// Packs a program folder into one self-contained JSON file for the app.
//
// Usage: node scripts/pack-program.mjs <program-dir> [output.json]
//
// <program-dir> holds a programs.json in the app's schema, with guide images
// given as file paths relative to that folder. The script inlines every image
// as a data URL, so the output needs no other files and can be sent through
// a chat app and imported on the phone ("Load program" or share to fitlog).
import { readFileSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const [dir, output = 'fitlog-program.json'] = process.argv.slice(2)
if (!dir) {
  console.error('Usage: node scripts/pack-program.mjs <program-dir> [output.json]')
  process.exit(1)
}

const file = JSON.parse(readFileSync(resolve(dir, 'programs.json'), 'utf8'))
// The format documentation travels in the source file; the packed one stays lean.
delete file.$comment

function inline(imagePath) {
  if (imagePath.startsWith('data:')) return imagePath
  const type = MIME[extname(imagePath).toLowerCase()]
  if (!type) throw new Error(`Unsupported image type: ${imagePath}`)
  const bytes = readFileSync(resolve(dir, imagePath))
  return `data:${type};base64,${bytes.toString('base64')}`
}

for (const program of file.programs ?? []) {
  for (const exercise of program.exercises ?? []) {
    if (exercise.guide?.images) {
      exercise.guide.images = exercise.guide.images.map(inline)
    }
  }
}

writeFileSync(output, JSON.stringify(file))
const kb = Math.round(Buffer.byteLength(JSON.stringify(file)) / 1024)
console.log(`Wrote ${output} (${kb} kB)`)
