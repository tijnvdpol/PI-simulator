import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, SSAO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { isTooSlow, setQuality, useQuality } from './quality'

/**
 * Ziet de werkbank te langzaam tekenen, dan gaat de kwaliteit vanzelf naar Laag. De werkbank tekent op aanvraag;
 * alleen frames uit een doorlopende reeks (animatie, slepen) tellen mee, anders zou elke rustpauze als "traag" tellen.
 */
function AutoQuality() {
  const times = useRef<number[]>([])
  useFrame((_, dt) => {
    const t = times.current
    t.push(dt * 1000)
    if (t.length >= 90) {
      if (isTooSlow(t)) setQuality('low')
      t.length = 0
    }
  })
  return null
}

/**
 * Nabewerking in de stand Hoog: ambient occlusion (SSAO; N8AO crasht met three 0.187) voor diepte in gaatjes en tussen onderdelen, bloom die alleen
 * oplicht wat veel helderder is dan wit (de brandende leds; die krijgen daarvoor een emissive boven de drempel), een lichte scherptediepte en ACES-tone mapping. In Laag tekent de renderer
 * zelf met ACES en is er niets van dit alles.
 */
export function Effects({ focus }: { focus: [number, number, number] }) {
  const quality = useQuality()
  const controls = useThree((s) => s.controls) as { target?: Vector3 } | null
  // De scherpte ligt op het punt waar je omheen kijkt (het draaipunt van de camera), niet op een vast punt.
  const focusPoint = useMemo(() => new Vector3(...focus), [focus])
  useFrame(() => { if (controls?.target) focusPoint.copy(controls.target) })
  if (quality === 'low') return null
  return (
    <>
      <EffectComposer enableNormalPass multisampling={4}>
        <SSAO samples={31} rings={6} radius={0.06} intensity={11} luminanceInfluence={0.5} bias={0.02} worldDistanceThreshold={80} worldDistanceFalloff={30} worldProximityThreshold={4} worldProximityFalloff={2} />
        <Bloom mipmapBlur luminanceThreshold={1.5} luminanceSmoothing={0.25} intensity={0.9} radius={0.7} />
        <DepthOfField target={focusPoint} focusRange={110} bokehScale={2.2} height={540} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
      <AutoQuality />
    </>
  )
}
