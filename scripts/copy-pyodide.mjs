// Kopieert de Pyodide-bestanden naar public/pyodide zodat we ze zelf hosten (COEP: require-corp).
import { cpSync, existsSync, mkdirSync } from 'node:fs'

const src = 'node_modules/pyodide'
const dest = 'public/pyodide'
if (!existsSync(src)) process.exit(0)
mkdirSync(dest, { recursive: true })
for (const f of ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json', 'pyodide.mjs']) {
  cpSync(`${src}/${f}`, `${dest}/${f}`)
}
