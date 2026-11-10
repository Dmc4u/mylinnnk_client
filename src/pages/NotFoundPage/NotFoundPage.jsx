import Button from '../../components/Button/Button.jsx'
import BrandMark from '../../components/Brand/BrandMark.jsx'
import './NotFoundPage.css'

export default function NotFoundPage({ message = 'The page you’re looking for doesn’t exist or has moved.' }) {
  return (
    <section className="not-found">
      <title>Page not found · MyLinnnk</title>
      <div className="container not-found__inner">
        <BrandMark size={56} />
        <h1 className="not-found__title">Page not found</h1>
        <p className="not-found__text">{message}</p>
        <div className="not-found__actions">
          <Button to="/templates">Browse templates</Button>
          <Button to="/" variant="ghost">
            Back to home
          </Button>
        </div>
      </div>
    </section>
  )
}
