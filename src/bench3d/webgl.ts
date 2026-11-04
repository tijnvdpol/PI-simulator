/** Het resultaat van de test hieronder; `LazyBench3D` vraagt het bij elke render en een browser staat maar ~16 WebGL-contexten tegelijk toe. */
let cached: boolean | undefined

function probe(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    // Geef de testcontext meteen vrij, anders telt hij mee tot de garbage collector hem opruimt.
    gl?.getExtension?.('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}

/** Kan deze browser WebGL aan? Zo niet, dan tonen we een melding in plaats van een lege werkbank. De test gebeurt één keer. */
export function hasWebGL(): boolean {
  return (cached ??= probe())
}

/** Alleen voor tests. */
export function resetWebGLCheck(): void {
  cached = undefined
}
