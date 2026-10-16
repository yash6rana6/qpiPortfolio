import Navbar from '../../components/Navbar.jsx'
import Footer from '../../components/Footer.jsx'
import CrawlStage from '../../components/ui/CrawlStage.jsx'
import AboutHero from '../../components/about/AboutHero.jsx'
import AboutStory from '../../components/about/AboutStory.jsx'
import AboutQGroup from '../../components/about/AboutQGroup.jsx'
import AboutValues from '../../components/about/AboutValues.jsx'
import AboutTeam from '../../components/about/AboutTeam.jsx'
import AboutCta from '../../components/about/AboutCta.jsx'

export const metadata = {
  title: 'About — QPIE',
  description: 'The team and the idea behind QPIE — live shows, booked in seconds.'
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-sand text-plum">
      <Navbar tone="solid" />
      <CrawlStage>
        <AboutHero />
        <AboutStory />
        <AboutQGroup />
        <AboutValues />
        <AboutTeam />
        <AboutCta />
      </CrawlStage>
      <Footer />
    </main>
  )
}
