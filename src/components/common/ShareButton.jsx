import { useEffect, useRef, useState } from 'react'
import { Share2, Check, AlertCircle } from 'lucide-react'
import { shareGun } from '../../utils/share'

/**
 * Button that shares a unique link to a product.
 * Uses the native share sheet on phones, otherwise copies the link.
 *
 * @param {Object}  props
 * @param {Object}  props.gun
 * @param {'icon'|'full'} [props.variant='full']
 */
export default function ShareButton({ gun, variant = 'full' }) {
  const [status, setStatus] = useState('idle') // idle | copied | shared | failed
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const handleClick = async (e) => {
    e.stopPropagation()
    const result = await shareGun(gun)
    if (result.status === 'cancelled') return
    setStatus(result.status)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 2200)
  }

  const label =
    status === 'copied'
      ? 'Link copied'
      : status === 'shared'
        ? 'Shared'
        : status === 'failed'
          ? 'Could not copy'
          : 'Share link'

  const Icon = status === 'failed' ? AlertCircle : status === 'idle' ? Share2 : Check

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`card-act-btn${status === 'copied' || status === 'shared' ? ' card-act-btn--ok' : ''}`}
        onClick={handleClick}
        aria-label={`${label}: ${gun.name}`}
        title={label}
      >
        <Icon size={16} />
        <span className="sr-only" role="status">{status === 'idle' ? '' : label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`btn btn--outline share-btn${status === 'copied' || status === 'shared' ? ' share-btn--ok' : ''}`}
      onClick={handleClick}
    >
      <Icon size={16} />
      <span role="status">{label}</span>
    </button>
  )
}
