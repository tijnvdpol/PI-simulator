import type { PyodideInterface } from 'pyodide'
import type { HardwareBridge } from './hardwareState'
import { installPythonFiles } from './pythonFiles'

/** Zet de hardwarebrug (`_hw`) en de Python-modules klaar. Gedeeld door worker en tests. */
export function bootPython(pyodide: PyodideInterface, bridge: HardwareBridge): void {
  pyodide.registerJsModule('_hw', bridge as unknown as Record<string, unknown>)
  installPythonFiles(pyodide)
}
