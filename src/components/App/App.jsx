import { Outlet, Route, Routes, useLocation } from 'react-router'
import Header from '../Header/Header.jsx'
import Footer from '../Footer/Footer.jsx'
import ScrollManager from '../ScrollManager/ScrollManager.jsx'
import HomePage from '../../pages/HomePage/HomePage.jsx'
import TemplatesPage from '../../pages/TemplatesPage/TemplatesPage.jsx'
import TemplatePreviewPage from '../../pages/TemplatePreviewPage/TemplatePreviewPage.jsx'
import NotFoundPage from '../../pages/NotFoundPage/NotFoundPage.jsx'
import './App.css'

function SiteLayout() {
  const { pathname } = useLocation()

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollManager />
      <Header />
      {/* Keyed by path so each page plays its entrance transition */}
      <main id="main" className="app__main page-transition" key={pathname}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="templates/:slug" element={<TemplatePreviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
