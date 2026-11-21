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
import { AccountView, DraftsView, LegacyAccountRedirect, NotificationsView, OverviewView, PaymentsView, PublicationsView, SupportView } from '../../pages/AccountPage/DashboardViews.jsx'
import NotificationsProvider from '../../notifications/NotificationsProvider.jsx'
import PricingPage from '../../pages/PricingPage/PricingPage.jsx'
import PublicPage from '../../pages/PublicPage/PublicPage.jsx'
import PublishPage from '../../pages/PublishPage/PublishPage.jsx'
import OrderPage from '../../pages/OrderPage/OrderPage.jsx'
import './App.css'

// The editor is only downloaded when someone opens it.
const EditorPage = lazy(() => import('../../pages/EditorPage/EditorPage.jsx'))
// Administration is only downloaded by people who open it (access is decided by the server).
const AdminApp = lazy(() => import('../../admin/AdminApp.jsx'))
// Information pages (forms and legal text) are downloaded only when opened.
const RequestQuotePage = lazy(() => import('../../pages/RequestQuotePage/RequestQuotePage.jsx'))
const ContactPage = lazy(() => import('../../pages/ContactPage/ContactPage.jsx'))
const PrivacyPolicyPage = lazy(() => import('../../pages/PrivacyPolicyPage/PrivacyPolicyPage.jsx'))
const TermsPage = lazy(() => import('../../pages/TermsPage/TermsPage.jsx'))
const CookieSettingsPage = lazy(() => import('../../pages/CookieSettingsPage/CookieSettingsPage.jsx'))

/** While an information page downloads: an empty, full-height space (the header stays). */
const infoPage = (Page) => (
  <Suspense fallback={<div className="app-loading" role="status" aria-label="Loading page" />}>
    <Page />
  </Suspense>
)

function EditorFallback() {
  return (
    <div className="app-loading" role="status">
      Opening the editor…
    </div>
  )
}

function SiteLayout() {
  const { pathname } = useLocation()

  // Signed in: one live notifications connection for the header bell and the dashboard.
  return (
    <NotificationsProvider>
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
    </NotificationsProvider>
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
        <Route path="request-quote" element={infoPage(RequestQuotePage)} />
        <Route path="contact" element={infoPage(ContactPage)} />
        <Route path="privacy-policy" element={infoPage(PrivacyPolicyPage)} />
        <Route path="terms-of-service" element={infoPage(TermsPage)} />
        <Route path="cookie-settings" element={infoPage(CookieSettingsPage)} />
        {/* Accounts. The editor never requires one. */}
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        {/* The customer dashboard: one layout (session check, navigation, shared data) and its views. */}
        <Route path="dashboard" element={<AccountPage />}>
          <Route index element={<OverviewView />} />
          <Route path="publications" element={<PublicationsView />} />
          <Route path="drafts" element={<DraftsView />} />
          <Route path="payments" element={<PaymentsView />} />
          <Route path="support" element={<SupportView />} />
          <Route path="notifications" element={<NotificationsView />} />
          <Route path="account" element={<AccountView />} />
        </Route>
        {/* The old address (links, bookmarks, #sections) leads to the matching dashboard view. */}
        <Route path="account" element={<LegacyAccountRedirect />} />
        {/* Publishing and manual bank-transfer payments (signed in) */}
        <Route path="publish/:pageId" element={<PublishPage />} />
        <Route path="orders/:reference" element={<OrderPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
