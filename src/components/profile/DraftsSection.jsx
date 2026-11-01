import { useState } from 'react'
import { FileText, Pencil, Plus, Trash2, Play } from 'lucide-react'
import LazyImage from '../common/LazyImage'
import ConfirmModal from '../modals/ConfirmModal'
import { deleteDraft, formatDraftTime } from '../../utils/draftStorage'
import { formatPrice } from '../../utils/helpers'

/**
 * Drafts — catalog entries that have an unfinished draft saved on this
 * device. Each one can be resumed in the Create / Edit form or discarded.
 *
 * @param {Object}   props
 * @param {Array}    props.drafts        from listDrafts()
 * @param {Function} props.onResume      (draft) => void
 * @param {Function} props.onChange      called after a draft was discarded
 */
export default function DraftsSection({ drafts, onResume, onChange }) {
  const [discardTarget, setDiscardTarget] = useState(null)

  const confirmDiscard = () => {
    if (discardTarget) deleteDraft(discardTarget.id)
    setDiscardTarget(null)
    onChange()
  }

  return (
    <section className="profile-section" aria-labelledby="profile-drafts-title">
      <div className="profile-section__head">
        <h2 id="profile-drafts-title" className="section-title">Drafts</h2>
        <span className="count">
          {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="drafts-empty">
          <FileText size={28} stroke="var(--steel)" />
          <p>
            No drafts yet. When you press <strong>Save Draft</strong> while adding or editing
            hardware, it is listed here so you can pick up where you left off.
          </p>
        </div>
      ) : (
        <ul className="draft-list">
          {drafts.map((draft) => (
            <li key={draft.id} className="draft-item">
              <div className="draft-item__thumb">
                {draft.image ? (
                  <LazyImage src={draft.image} alt="" className="draft-item__img" width="64" height="64" />
                ) : (
                  <FileText size={22} stroke="var(--steel)" />
                )}
              </div>

              <div className="draft-item__body">
                <span className="draft-item__name display">{draft.name}</span>
                <span className="draft-item__meta">
                  {draft.kind === 'new' ? (
                    <span className="draft-tag draft-tag--new"><Plus size={12} /> New item</span>
                  ) : (
                    <span className="draft-tag"><Pencil size={12} /> Editing</span>
                  )}
                  {[draft.type, draft.caliber].filter(Boolean).join(' · ')}
                  {draft.price != null && !Number.isNaN(draft.price) && ` · ${formatPrice(draft.price)}`}
                </span>
                <span className="draft-item__time">
                  Saved {formatDraftTime(draft.savedAt) || 'earlier'}
                </span>
              </div>

              <div className="draft-item__actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => onResume(draft)}
                >
                  <Play size={14} /> Resume
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setDiscardTarget(draft)}
                  aria-label={`Discard draft ${draft.name}`}
                  title="Discard draft"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(discardTarget)}
        title="Discard Draft"
        message={`Discard the draft "${discardTarget?.name}"? This cannot be undone.`}
        confirmLabel="Discard"
        danger
        onConfirm={confirmDiscard}
        onCancel={() => setDiscardTarget(null)}
      />
    </section>
  )
}
