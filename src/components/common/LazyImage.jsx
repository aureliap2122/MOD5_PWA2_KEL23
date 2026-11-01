import { useEffect, useRef, useState } from 'react'

const FALLBACK_SRC = '/guns/pistol.svg'

function LazyImageInner({ src, alt, className = '', width, height, priority }) {
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  // The image may already be complete (cache hit) before React attached onLoad.
  useEffect(() => {
    const img = ref.current
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true)
  }, [])

  return (
    <span className={`lazy-img${loaded ? ' lazy-img--loaded' : ''}`}>
      <img
        ref={ref}
        className={className}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (currentSrc !== FALLBACK_SRC) setCurrentSrc(FALLBACK_SRC)
          else setLoaded(true)
        }}
      />
    </span>
  )
}

/**
 * <img> that is loaded lazily by the browser (only when it nears the
 * viewport), decoded off the main thread, shows a shimmer placeholder until it
 * arrives and falls back to a bundled image if the URL is broken.
 */
export default function LazyImage(props) {
  // `key` resets the loaded/error state whenever the source changes.
  return <LazyImageInner key={props.src} {...props} />
}
