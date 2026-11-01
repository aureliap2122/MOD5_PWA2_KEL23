import { useEffect } from 'react'
import { Loader, AlertCircle, ArrowLeft } from 'lucide-react'
import GunDetail from '../components/gun/GunDetail'
import { useGunById } from '../hooks/useGuns'

/**
 * Loads one product by id (from the query cache when available) and renders
 * its detail view. This is also the landing page for shared links
 * (`/?gun=<id>`), where only the id is known.
 */
export default function GunDetailPage({ gunId, onBack, onEdit, onDelete }) {
  const { gun, loading, error, refetch } = useGunById(gunId)

  useEffect(() => {
    if (!gun?.name) return undefined
    const previous = document.title
    document.title = `${gun.name} — Bore & Barrel`
    return () => {
      document.title = previous
    }
  }, [gun?.name])

  if (loading) {
    return (
      <div className="state-box">
        <Loader size={28} className="spin" />
        <p>Loading product…</p>
      </div>
    )
  }

  if (error || !gun) {
    return (
      <div className="state-box state-box--error">
        <AlertCircle size={28} />
        <p>{error || 'This product could not be found. The link may be outdated.'}</p>
        <div className="state-box__actions">
          <button type="button" className="btn btn--outline" onClick={refetch}>
            Try again
          </button>
          <button type="button" className="btn btn--outline" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Catalog
          </button>
        </div>
      </div>
    )
  }

  return <GunDetail key={gun.id} gun={gun} onBack={onBack} onEdit={onEdit} onDelete={onDelete} />
}
