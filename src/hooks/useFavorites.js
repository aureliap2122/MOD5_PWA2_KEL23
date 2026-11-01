import { useState } from 'react'
import { useQuery } from './useQuery'
import { setQueryData, invalidateQueries } from '../lib/queryCache'
import favoriteService from '../services/favoriteService'
import { getUserIdentifier } from '../services/userService'

// ---------------------------------------------------------------------------
// localStorage fallback — used when the backend is unavailable so that
// favourites are still fully functional offline.
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'bore_barrel_favorites'

const readLocalFavs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids))
  } catch {
    /* quota exceeded — silently fail */
  }
}

// ---------------------------------------------------------------------------
// useFavorites — list all favourited products.
//
// First attempts the server; on failure uses localStorage.  The result is
// cached under ['favorites', userId], so every heart button, the header badge
// and the Favorites page share ONE request instead of one each.
// ---------------------------------------------------------------------------

const favoritesKey = (userIdentifier) => ['favorites', userIdentifier]

export function useFavorites() {
  const userIdentifier = getUserIdentifier()

  const { data, isLoading, refetch } = useQuery(
    favoritesKey(userIdentifier),
    async () => {
      try {
        const response = await favoriteService.getFavorites(userIdentifier)
        if (!response.success) throw new Error(response.message)
        return { items: response.data || [], isLocal: false }
      } catch {
        // Fallback to localStorage
        return { items: readLocalFavs(), isLocal: true }
      }
    },
    { staleTime: 60 * 1000 },
  )

  return {
    favorites: data?.items || [],
    loading: isLoading,
    error: null,
    isLocal: data?.isLocal ?? false,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useToggleFavorite — toggle a product in/out of favourites.
// ---------------------------------------------------------------------------

export function useToggleFavorite() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const userIdentifier = getUserIdentifier()

  const toggleFavorite = async (gunId) => {
    try {
      setLoading(true)
      setError(null)

      const response = await favoriteService.toggleFavorite({
        recipe_id: gunId,
        user_identifier: userIdentifier,
      })

      if (response.success) {
        // Server state changed: refetch the shared favourites query once.
        invalidateQueries(['favorites'])
        return response.data
      }
      throw new Error(response.message)
    } catch {
      // Fallback: toggle in localStorage and update the cache right away
      // (no need to wait for a request to a server we know is unreachable).
      const current = readLocalFavs()
      const idx = current.findIndex((id) => String(id) === String(gunId))
      let isFavorited

      if (idx === -1) {
        current.push(gunId)
        isFavorited = true
      } else {
        current.splice(idx, 1)
        isFavorited = false
      }
      writeLocalFavs(current)
      setQueryData(favoritesKey(userIdentifier), { items: current, isLocal: true })
      return { is_favorited: isFavorited }
    } finally {
      setLoading(false)
    }
  }

  return { toggleFavorite, loading, error }
}

// ---------------------------------------------------------------------------
// useIsFavorited — convenience wrapper for a single product.
// ---------------------------------------------------------------------------

export function useIsFavorited(gunId) {
  const { favorites, loading: fetchLoading } = useFavorites()
  const { toggleFavorite: toggle, loading: toggleLoading } = useToggleFavorite()

  // Check both server-format (objects with .id) and local-format (plain ids)
  const isFavorited = favorites.some((fav) => {
    const favId = typeof fav === 'object' && fav !== null ? (fav.id ?? fav.product_id ?? fav.recipe_id) : fav
    return String(favId) === String(gunId)
  })

  return {
    isFavorited,
    loading: fetchLoading || toggleLoading,
    toggleFavorite: () => toggle(gunId),
  }
}

export { getUserIdentifier }
