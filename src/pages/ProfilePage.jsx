import { useState } from 'react'
import { Shield, Copy, Check, Heart, FileText, Play, Pencil } from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import { listDrafts } from '../utils/draftStorage'
import LazyImage from '../components/common/LazyImage'
import DraftsSection from '../components/profile/DraftsSection'
import AboutSection from '../components/profile/AboutSection'
import ContactSection from '../components/profile/ContactSection'

/**
 * ProfilePage — read-only overview of the operator, with:
 *   • the operator card (avatar, alias, id, bio) and quick stats
 *   • Drafts   — catalog entries that have an unfinished draft
 *   • About    — about the shop   (moved from the old About page)
 *   • Contact  — how to reach us  (moved from the old Contact page)
 *
 * Changing the name / bio / avatar happens on the separate Edit Profile page.
 */
export default function ProfilePage({ onReplaySplash, onEditProfile, onResumeDraft }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [drafts, setDrafts] = useState(listDrafts)
  const [copied, setCopied] = useState(false)

  const { favorites } = useFavorites()

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard?.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="profile-page">
      <section
        className="masthead profile-masthead"
      >
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">
            Operator credentials, procurement statistics, and armorer details.
          </p>
        </div>
        <div className="profile-masthead__actions">
          {onEditProfile && (
            <button type="button" className="btn btn--primary btn--sm" onClick={onEditProfile}>
              <Pencil size={14} /> Edit Profile
            </button>
          )}
          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
              title="Replay introductory splash animation"
            >
              <Play size={14} /> Replay Intro
            </button>
          )}
        </div>
      </section>

      {/* Operator Card */}
      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <LazyImage src={profile.avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
          </div>

          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Copy User ID to clipboard"
                aria-label="Copy User ID to clipboard"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        <p className={`profile-bio${profile.bio ? '' : ' profile-bio--empty'}`}>
          {profile.bio || 'No station bio yet — use Edit Profile to add one.'}
        </p>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Procurement Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{drafts.length}</div>
            <div className="stat-label">Saved Offline Drafts</div>
          </div>
        </div>
      </div>

      <DraftsSection
        drafts={drafts}
        onResume={onResumeDraft}
        onChange={() => setDrafts(listDrafts())}
      />
      <AboutSection />
      <ContactSection />
    </div>
  )
}
