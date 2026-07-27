import { Link, useNavigate } from 'react-router-dom'
import { externalLinks } from '../config/externalLinks'
import {
  aboutHistory,
  coreValues,
  institutionMotto,
  iqadmsAboutNote,
  mission,
  molinoCampus,
  philosophy,
  vision
} from '../config/institutionAbout'
import { upshd } from '../theme/upshd'
import '../theme/landing.css'

const USES = [
  'Track PACUCOA and accreditation activities, deadlines, and required documents.',
  'Assign and monitor PQAD tasks across projects, departments, and staff.',
  'Upload and auto-file evidence (e.g. operational plans by year and document type).',
  'View announcements, calendar events, reports, and department progress in one place.',
  'Submit extension and document requests, feedback, and bug reports for continuous improvement.'
]

export default function LandingPage() {
  const navigate = useNavigate()
  const isSignedIn = Boolean(localStorage.getItem('token'))

  return (
    <div className="landing">
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <Link to="/" className="landing-brand">
            <span className="landing-brand-mark">IQADMS</span>
            <span className="landing-brand-sub">PQAD · UPSHD Molino</span>
          </Link>
          <nav className="landing-nav">
            <a href="#overview">Overview</a>
            <a href="#about">About</a>
            <a href="#uses">Uses</a>
            <a href="#background">Background</a>
            <a href="#resources">Resources</a>
            {isSignedIn ? (
              <button type="button" className="landing-btn landing-btn-primary" onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
            ) : (
              <>
                <button type="button" className="landing-btn landing-btn-ghost" onClick={() => navigate('/register')}>
                  Register
                </button>
                <button type="button" className="landing-btn landing-btn-primary" onClick={() => navigate('/login')}>
                  Sign in
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <p className="landing-eyebrow">University of Perpetual Help System DALTA</p>
          <h1>Integrated Quality Assurance Document Management System</h1>
          <p className="landing-hero-lead">
            IQADMS supports the Planning and Quality Assurance Department (PQAD) at the Molino campus —
            coordinating accreditation work, documents, tasks, and reporting in a single workspace.
          </p>
          <div className="landing-hero-actions">
            {isSignedIn ? (
              <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={() => navigate('/dashboard')}>
                Open PQAD Dashboard
              </button>
            ) : (
              <>
                <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={() => navigate('/login')}>
                  Sign in to IQADMS
                </button>
                <button type="button" className="landing-btn landing-btn-outline landing-btn-lg" onClick={() => navigate('/request-account')}>
                  Request access
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <main className="landing-main">
        <section id="overview" className="landing-section">
          <h2>Overview</h2>
          <p>
            IQADMS is the internal platform for PQAD Molino to plan, execute, and document quality assurance
            and accreditation activities. It connects people, deadlines, evidence files, and monitoring views so
            teams can see what is due, who is responsible, and what has been submitted — without scattered
            spreadsheets and ad hoc folders.
          </p>
          <div className="landing-highlight-grid">
            <article className="landing-highlight">
              <h3>For PQAD staff</h3>
              <p>Dashboard hub, my tasks, projects, monitoring, notifications, and reports.</p>
            </article>
            <article className="landing-highlight">
              <h3>For departments</h3>
              <p>Tracked as related offices; submissions and requests tied to accreditation requirements.</p>
            </article>
            <article className="landing-highlight">
              <h3>For leadership</h3>
              <p>Statistics, deadlines, calendar, and exportable summaries for coordination meetings.</p>
            </article>
          </div>
        </section>

        <section id="about" className="landing-section landing-section-about">
          <h2>About</h2>
          <p className="landing-motto">{institutionMotto}</p>

          <div className="landing-about-institution">
            <p className="landing-about-name">
              {molinoCampus.institutionName} — {molinoCampus.campusName}
            </p>
            <p className="landing-about-location">
              <span aria-hidden>📍</span> {molinoCampus.address}
            </p>
            <ul className="landing-about-contact">
              <li>Tel. {molinoCampus.phone}</li>
              <li>{molinoCampus.mobile}</li>
              <li>
                <a href={`mailto:${molinoCampus.email}`}>{molinoCampus.email}</a>
              </li>
            </ul>
          </div>

          <h3 className="landing-about-subhead">About the University</h3>
          <p>{aboutHistory}</p>

          <h3 className="landing-about-subhead">Philosophy</h3>
          <p>{philosophy}</p>

          <div className="landing-mv-grid">
            <article className="landing-highlight landing-mv-card landing-mv-card-wide">
              <h3>Vision</h3>
              {vision.split('\n\n').map(paragraph => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </article>
            <article className="landing-highlight landing-mv-card landing-mv-card-wide">
              <h3>Mission</h3>
              {mission.split('\n\n').map(paragraph => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </article>
          </div>

          <h3 className="landing-about-subhead">Core values</h3>
          <ul className="landing-core-values">
            {coreValues.map(value => (
              <li key={value}>{value}</li>
            ))}
          </ul>

          <p className="landing-about-note">{iqadmsAboutNote}</p>
          <p className="landing-about-more">
            <a href={molinoCampus.officialSiteHref} target="_blank" rel="noopener noreferrer">
              Read more on the official Molino campus website →
            </a>
          </p>
        </section>

        <section id="uses" className="landing-section">
          <h2>Uses</h2>
          <p className="landing-section-intro">Typical ways Molino PQAD uses IQADMS:</p>
          <ul className="landing-uses-list">
            {USES.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section id="background" className="landing-section">
          <h2>Background</h2>
          <p>
            Quality assurance in higher education depends on clear plans, timely evidence, and coordinated
            follow-through across academic and administrative units. At UPSHD Molino, the Planning and Quality
            Assurance Department leads preparation for visits such as PACUCOA, aligns operational plans with
            institutional goals, and works with schools and offices to complete required documents.
          </p>
          <p>
            IQADMS was developed to give PQAD a dedicated digital workspace on campus — aligned with UPSHD
            branding and workflows — while staying connected to broader campus resources through official
            websites and assistant tools linked below.
          </p>
        </section>

        <section id="resources" className="landing-section">
          <h2>Campus &amp; partner links</h2>
          <p className="landing-section-intro">
            Official Molino campus site, MOLSA admin portal, IoT Lab, and campus chatbots.
          </p>
          <div className="landing-links-grid">
            {externalLinks.map(link => {
              const ready = Boolean(link.href?.trim())
              const body = (
                <>
                  <span className="landing-link-icon" aria-hidden>{link.icon}</span>
                  <h3>{link.title}</h3>
                  <p>{link.description}</p>
                  {ready ? (
                    <span className="landing-link-cta">Visit site →</span>
                  ) : (
                    <span className="landing-link-pending">Link coming soon</span>
                  )}
                </>
              )

              if (ready) {
                return (
                  <a
                    key={link.id}
                    className="landing-link-card"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {body}
                  </a>
                )
              }

              return (
                <div key={link.id} className="landing-link-card landing-link-card-disabled" aria-disabled="true">
                  {body}
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>
          <strong style={{ color: upshd.maroon }}>IQADMS</strong> · Planning and Quality Assurance Department
        </p>
        <p>{molinoCampus.institutionName} — {molinoCampus.campusName}</p>
        <p>{molinoCampus.address}</p>
        <p className="landing-footer-note">Authorized PQAD users only. Sign in for full access.</p>
      </footer>
    </div>
  )
}
