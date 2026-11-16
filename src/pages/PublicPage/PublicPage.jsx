import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import TemplateRender from '../../components/TemplateRender/TemplateRender.jsx'
import BrandMark from '../../components/Brand/BrandMark.jsx'
import NeonRingLoader from '../../components/Loading/NeonRingLoader.jsx'
import useDelayedLoading from '../../hooks/useDelayedLoading.js'
import { SLUG_PATTERN, cleanedSlug, loadPublishedPage } from './publicPage.js'
import './PublicPage.css'

const MESSAGES = {
  not_found: { title: 'Page not found', text: 'There’s no page at this address. Check the link you were given.' },
  unavailable: { title: 'This page isn’t available right now', text: 'It may have been taken offline by its owner or reached the end of its publishing period.' },
  error: { title: 'We couldn’t load this page', text: 'Please check your connection and try again.' },
}

/**
 * /p/:slug — a published page as visitors see it: the page alone (no site
 * header, footer or editor controls), drawn by the same renderer as the editor
 * preview. No login needed; nothing private is requested.
 */
export default function PublicPage() {
  const { slug } = useParams()
  const [state, setState] = useState({ status: 'loading', slug })
  const [attempt, setAttempt] = useState(0)
  // A pasted link with extra characters at the end ("moses**", "moses."): go to the address meant.
  const cleaned = SLUG_PATTERN.test(slug) ? slug : cleanedSlug(slug)
  const redirect = cleaned && cleaned !== slug

  useEffect(() => {
    if (redirect) return undefined
    let active = true
    loadPublishedPage(slug).then((result) => active && setState({ ...result, slug }))
    return () => {
      active = false
    }
  }, [slug, attempt, redirect])

  // A new address (client-side navigation) starts in the loading state.
  const current = state.slug === slug ? state : { status: 'loading', slug }
  const showLoader = useDelayedLoading(current.status === 'loading')

  if (redirect) return <Navigate to={`/p/${cleaned}`} replace />

  if (current.status === 'ready') {
    return (
      <main className="public-page" aria-label={current.page.title || 'Published page'}>
        <title>{current.page.title ? `${current.page.title}` : 'MyLinnnk page'}</title>
        <TemplateRender template={current.page.render} mode="published" branding={current.page.branding} motion="play" />
      </main>
    )
  }

  if (current.status === 'loading') {
    return (
      <main className="public-page neon-loading-region" aria-busy="true">
        <title>Loading… · MyLinnnk</title>
        {showLoader && <NeonRingLoader mode="full-page" size="lg" message="Loading page…" />}
      </main>
    )
  }

  const message = MESSAGES[current.status] ?? MESSAGES.error
  return (
    <main className="public-state">
      <title>{`${message.title} · MyLinnnk`}</title>
      <div className="public-state__card" role={current.status === 'error' ? 'alert' : undefined}>
        <BrandMark size={44} />
        <h1>{message.title}</h1>
        <p>{message.text}</p>
        <div className="public-state__actions">
          {current.status === 'error' && (
            <button type="button" className="public-state__btn" onClick={() => { setState({ status: 'loading', slug }); setAttempt((n) => n + 1) }}>
              Try again
            </button>
          )}
          <Link to="/" className="public-state__link">
            Go to MyLinnnk
          </Link>
        </div>
      </div>
    </main>
  )
}
