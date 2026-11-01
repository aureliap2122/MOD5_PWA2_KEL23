import { useState } from 'react'
import { ArrowLeft, Camera, Save, Shield, Trash2 } from 'lucide-react'
import userService from '../services/userService'
import LazyImage from '../components/common/LazyImage'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

/**
 * EditProfilePage — dedicated page for changing the operator alias, bio and
 * avatar. Reached from the "Edit Profile" button on the Profile page.
 * Nothing is stored until the form is saved.
 */
export default function EditProfilePage({ onBack, onSaved }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [error, setError] = useState('')

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return

    if (file.size > MAX_AVATAR_BYTES) {
      setError('Avatar image must be under 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatar(event.target.result)
      setError('')
    }
    reader.onerror = () => setError('Could not read that image.')
    reader.readAsDataURL(file)
  }

  const handleSave = (e) => {
    e.preventDefault()
    const result = userService.saveUserProfile({
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    })
    if (result.success) {
      onSaved()
    } else {
      setError('Failed to save profile. Storage may be full — try a smaller avatar.')
    }
  }

  return (
    <div className="profile-page">
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Profile
      </button>

      <section className="masthead">
        <h1 className="display">Edit Profile</h1>
        <p className="lede">Update your alias, station bio and avatar.</p>
      </section>

      {error && (
        <div className="toast toast--error" role="alert">{error}</div>
      )}

      <form onSubmit={handleSave} className="profile-form">
        <h3 className="section-title">Armorer Details</h3>

        <div className="edit-avatar">
          <div className="avatar-wrap">
            {avatar ? (
              <LazyImage src={avatar} alt="Avatar preview" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
            <label htmlFor="avatar-file-input" className="avatar-upload-btn" title="Upload avatar">
              <Camera size={14} />
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>
          <div className="edit-avatar__text">
            <span className="form-label">Avatar</span>
            <span className="form-hint">PNG or JPG, up to 2MB.</span>
            {avatar && (
              <button
                type="button"
                className="btn btn--danger-ghost btn--sm"
                onClick={() => setAvatar(null)}
              >
                <Trash2 size={14} /> Remove avatar
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="prof-name" className="form-label">
            Callsign / Operator Alias
          </label>
          <input
            id="prof-name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Operator Delta, Master Gunsmith"
            className="form-input"
            maxLength={40}
          />
        </div>

        <div className="form-group">
          <label htmlFor="prof-bio" className="form-label">
            Armory Notes / Station Bio
          </label>
          <textarea
            id="prof-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Qualifications, preferred calibers, unit assignment..."
            rows={4}
            className="form-textarea"
            maxLength={300}
          />
        </div>

        <div className="form-actions-row">
          <button type="submit" className="btn btn--primary">
            <Save size={16} /> Save Armorer Profile
          </button>
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
