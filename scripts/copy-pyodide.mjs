// Kopieert de Pyodide-bestanden naar public/pyodide zodat we ze zelf hosten (COEP: require-corp).
// Naast de kern gaat ook de Pillow-wheel mee (vendor/pyodide); die zit niet in het npm-pakket.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'

const src = 'node_modules/pyodide'
const dest = 'public/pyodide'
if (!existsSync(src)) process.exit(0)
mkdirSync(dest, { recursive: true })
for (const f of ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json', 'pyodide.mjs']) {
  cpSync(`${src}/${f}`, `${dest}/${f}`)
}
if (existsSync('vendor/pyodide')) {
  for (const f of readdirSync('vendor/pyodide')) cpSync(`vendor/pyodide/${f}`, `${dest}/${f}`)
}
