/** Kan deze browser WebGL aan? Zo niet, dan tonen we een melding in plaats van een lege werkbank. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    // Geef de proefcontext meteen terug: browsers houden er maar een stuk of 16 tegelijk open.
    gl?.getExtension?.('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}
