import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import App from './App.jsx'

// Vite removes this import and route from production builds.
const NeonLoaderPreview = import.meta.env.DEV
  ? lazy(() => import('../../dev/NeonLoaderPreview.jsx'))
  : null

export default function AppRoutes() {
  if (!import.meta.env.DEV) return <App />

  return (
    <Routes>
      <Route
        path="dev/neon-loader"
        element={<Suspense fallback={null}><NeonLoaderPreview /></Suspense>}
      />
      <Route path="*" element={<App />} />
    </Routes>
  )
}
