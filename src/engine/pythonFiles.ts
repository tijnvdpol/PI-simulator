import type { PyodideInterface } from 'pyodide'

const files = import.meta.glob('../python/**/*.py', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const PY_ROOT = '/pisim'

/** Schrijft alle meegeleverde Python-modules (nep-gpiozero, pisim) naar het Pyodide-bestandssysteem. */
export function installPythonFiles(pyodide: PyodideInterface): void {
  for (const [path, source] of Object.entries(files)) {
    const rel = path.replace('../python/', '')
    const full = `${PY_ROOT}/${rel}`
    const dir = full.slice(0, full.lastIndexOf('/'))
    pyodide.FS.mkdirTree(dir)
    pyodide.FS.writeFile(full, source)
  }
  pyodide.runPython(`import sys\nif "${PY_ROOT}" not in sys.path: sys.path.insert(0, "${PY_ROOT}")`)
}
