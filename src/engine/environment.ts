export interface EnvironmentGlobals { crossOriginIsolated?: boolean; SharedArrayBuffer?: unknown }

/** De simulator heeft SharedArrayBuffer nodig, en die werkt alleen op een cross-origin-isolated pagina. */
export function checkEnvironment(g: EnvironmentGlobals = globalThis as unknown as EnvironmentGlobals): { ok: true } | { ok: false; melding: string } {
  if (g.crossOriginIsolated && typeof g.SharedArrayBuffer !== 'undefined') return { ok: true }
  return {
    ok: false,
    melding:
      'Deze pagina kan hier niet draaien. De Pi-simulator heeft een beveiligde omgeving nodig (COOP/COEP-headers). ' +
      'Open de site via de normale website of via `npm run dev` — niet als los bestand — en gebruik een recente versie van Chrome, Edge of Firefox.',
  }
}
