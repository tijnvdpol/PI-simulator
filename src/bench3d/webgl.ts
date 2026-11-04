/** Kan deze browser WebGL aan? Zo niet, dan tonen we een melding in plaats van een lege werkbank. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
