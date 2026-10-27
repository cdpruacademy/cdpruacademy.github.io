// Builds the PNG icons the LINE bot (CODY) uses in its Flex messages: LINE cannot show SVG.
// Reads the same line icons as the website (components/icon.tsx) and writes public/cody/*.png.
// Run: node scripts/make-cody-icons.mjs
import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..")
const file = fs.readFileSync(path.join(root, "components/icon.tsx"), "utf8")
// Only the PATHS table (PHASE_ICONS below it maps names to names)
const src = file.slice(file.indexOf("const PATHS"), file.indexOf("} as const"))
const paths = {}
for (const m of src.matchAll(/^\s+(\w+):\s*\n?\s*"([^"]+)",?$/gm)) paths[m[1]] = m[2]

const NAMES = [
  "kickoff", "draft", "elearning", "approval", "finalElearning", "training", "launch",
  "check", "completed", "inProgress", "partner", "user", "calendar", "folder", "product",
  "wrench", "timeline", "chart", "megaphone", "send", "search",
]
const COLORS = { white: "#FFFFFF", grey: "#A8A29E", ink: "#1C1917", red: "#C8102E" }

const out = path.join(root, "public/cody")
fs.mkdirSync(out, { recursive: true })

const svg = (d, color, stroke) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`

for (const name of NAMES) {
  if (!paths[name]) throw new Error(`No icon path for ${name}`)
  for (const [key, color] of Object.entries(COLORS)) {
    const stroke = name === "check" ? 2.6 : 1.9
    await sharp(Buffer.from(svg(paths[name], color, stroke))).png().toFile(path.join(out, `${name}-${key}.png`))
  }
}

// CODY mark: a chat bubble with two eyes on a red rounded square
const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="13" fill="#ED1B2E"/>
  <path d="M14 15h20a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H22l-6 5v-5h-2a4 4 0 0 1-4-4V19a4 4 0 0 1 4-4z" fill="none" stroke="#FFFFFF" stroke-width="2.8" stroke-linejoin="round"/>
  <circle cx="19.5" cy="24" r="2.2" fill="#FFFFFF"/>
  <circle cx="28.5" cy="24" r="2.2" fill="#FFFFFF"/>
</svg>`
await sharp(Buffer.from(logo)).png().toFile(path.join(out, "cody-logo.png"))

console.log(`Wrote ${NAMES.length * Object.keys(COLORS).length + 1} icons to public/cody`)
