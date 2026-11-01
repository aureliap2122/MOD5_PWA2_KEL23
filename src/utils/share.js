// ---------------------------------------------------------------------------
// share.js — unique, shareable links for a product.
//
// A product link is the app URL plus a `gun` query parameter:
//     https://your-app.vercel.app/?gun=42
// Query strings need no server rewrite rules, so the link works on Vercel,
// in the dev server and inside the installed PWA.
// ---------------------------------------------------------------------------

export const SHARE_PARAM = 'gun'

/** Absolute, unique URL that opens the given product. */
export const buildShareUrl = (gunId) => {
  const url = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
  url.searchParams.set(SHARE_PARAM, String(gunId))
  return url.toString()
}

/** The product id requested by the current URL (or null). */
export const readSharedGunId = (search = window.location.search) => {
  const id = new URLSearchParams(search).get(SHARE_PARAM)
  return id ? id.trim() || null : null
}

/** Put the product id in the address bar (adds a history entry). */
export const pushGunUrl = (gunId) => {
  const url = new URL(window.location.href)
  url.searchParams.set(SHARE_PARAM, String(gunId))
  window.history.pushState({ [SHARE_PARAM]: String(gunId) }, '', url)
}

/** Remove the product id from the address bar without adding a history entry. */
export const clearGunUrl = () => {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(SHARE_PARAM)) return
  url.searchParams.delete(SHARE_PARAM)
  window.history.replaceState(null, '', url)
}

const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* permission denied or insecure context — try the legacy path */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

// Only phones/tablets get the native share sheet; on desktop a share sheet is
// surprising, so there the button simply copies the link.
const prefersNativeShare = () =>
  typeof navigator.share === 'function' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches

/**
 * Share a product link.
 * @returns {Promise<{status: 'shared'|'copied'|'cancelled'|'failed', url: string}>}
 */
export const shareGun = async (gun) => {
  const id = gun.id ?? gun.name
  const url = buildShareUrl(id)

  if (prefersNativeShare()) {
    try {
      await navigator.share({
        title: `${gun.name} — Bore & Barrel`,
        text: `Check out ${gun.name} at Bore & Barrel`,
        url,
      })
      return { status: 'shared', url }
    } catch (err) {
      if (err && err.name === 'AbortError') return { status: 'cancelled', url }
      /* any other failure: fall back to copying */
    }
  }

  const copied = await copyToClipboard(url)
  return { status: copied ? 'copied' : 'failed', url }
}
