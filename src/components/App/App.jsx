import Header from '../Header/Header.jsx'
import Hero from '../Hero/Hero.jsx'
import Features from '../Features/Features.jsx'
import Moments from '../Moments/Moments.jsx'
import HowItWorks from '../HowItWorks/HowItWorks.jsx'
import GetStarted from '../GetStarted/GetStarted.jsx'
import Footer from '../Footer/Footer.jsx'
import './App.css'

function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="app__main">
        <Hero />
        <Features />
        <Moments />
        <HowItWorks />
        <GetStarted />
      </main>
      <Footer />
    </div>
  )
}

export default App
