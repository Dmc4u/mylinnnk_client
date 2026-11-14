import { Suspense, lazy } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router'
import Header from '../Header/Header.jsx'
import Footer from '../Footer/Footer.jsx'
import ScrollManager from '../ScrollManager/ScrollManager.jsx'
import HomePage from '../../pages/HomePage/HomePage.jsx'
import TemplatesPage from '../../pages/TemplatesPage/TemplatesPage.jsx'
import TemplatePreviewPage from '../../pages/TemplatePreviewPage/TemplatePreviewPage.jsx'
import NotFoundPage from '../../pages/NotFoundPage/NotFoundPage.jsx'
import LoginPage from '../../pages/LoginPage/LoginPage.jsx'
import SignupPage from '../../pages/SignupPage/SignupPage.jsx'
import ForgotPasswordPage from '../../pages/ForgotPasswordPage/ForgotPasswordPage.jsx'
import ResetPasswordPage from '../../pages/ResetPasswordPage/ResetPasswordPage.jsx'
import VerifyEmailPage from '../../pages/VerifyEmailPage/VerifyEmailPage.jsx'
import AccountPage from '../../pages/AccountPage/AccountPage.jsx'
import PricingPage from '../../pages/PricingPage/PricingPage.jsx'
import PublicPage from '../../pages/PublicPage/PublicPage.jsx'
import PublishPage from '../../pages/PublishPage/PublishPage.jsx'
import OrderPage from '../../pages/OrderPage/OrderPage.jsx'
import './App.css'

// The editor is only downloaded when someone opens it.
const EditorPage = lazy(() => import('../../pages/EditorPage/EditorPage.jsx'))
// Administration is only downloaded by people who open it (access is decided by the server).
const AdminApp = lazy(() => import('../../admin/AdminApp.jsx'))

function EditorFallback() {
  return (
    <div className="app-loading" role="status">
      Opening the editor…
    </div>
  )
}

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
      <Footer continuous={pathname === '/'} />
    </div>
  )
}

function App() {
  return (
    <Routes>
      {/* A published page: the page alone, no site header/footer */}
      <Route path="p/:slug" element={<PublicPage />} />
      {/* Administration: its own layout; every request is authorised by the server */}
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<EditorFallback />}>
            <AdminApp />
          </Suspense>
        }
      />
      {/* Full-screen editor: no site header/footer */}
      <Route
        path="editor/:templateSlug"
        element={
          <Suspense fallback={<EditorFallback />}>
            <EditorPage />
          </Suspense>
        }
      />
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="templates/:slug" element={<TemplatePreviewPage />} />
        <Route path="pricing" element={<PricingPage />} />
        {/* Accounts. The editor never requires one. */}
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="account" element={<AccountPage />} />
        {/* Publishing and manual bank-transfer payments (signed in) */}
        <Route path="publish/:pageId" element={<PublishPage />} />
        <Route path="orders/:reference" element={<OrderPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
