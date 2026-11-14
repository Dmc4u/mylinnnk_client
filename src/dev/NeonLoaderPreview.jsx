import { useEffect, useState } from 'react'
import NeonRingLoader from '../components/Loading/NeonRingLoader.jsx'
import MagneticButton from '../components/UI/MagneticButton.jsx'
import './NeonLoaderPreview.css'

export default function NeonLoaderPreview() {
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (complete) return undefined
    const timer = window.setTimeout(() => setComplete(true), 10000)
    return () => window.clearTimeout(timer)
  }, [complete])

  return (
    <main className="neon-loading-region" aria-busy={!complete}>
      <title>Neon loader preview · MyLinnnk</title>
      {complete ? (
        <section className="neon-loader-preview">
          <div role="status"><h1>Preview complete</h1></div>
          <MagneticButton onClick={() => setComplete(false)}>Replay</MagneticButton>
        </section>
      ) : (
        <NeonRingLoader mode="full-page" size="lg" message="Preparing your MyLinnnk experience..." />
      )}
    </main>
  )
}
