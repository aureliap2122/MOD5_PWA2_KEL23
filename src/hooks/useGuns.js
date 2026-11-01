import { useQuery } from './useQuery'
import gunService from '../services/gunService'
import GUNS_LOCAL from '../data/guns'

// ---------------------------------------------------------------------------
// Query keys — every product query lives under ['guns'] so a single
// invalidateQueries(['guns']) (done by gunService after create/update/delete)
// refreshes lists, details and categories.
// ---------------------------------------------------------------------------
export const gunKeys = {
  all: ['guns'],
  list: (params) => ['guns', 'list', params],
  detail: (id) => ['guns', 'detail', String(id)],
  categories: ['guns', 'categories'],
}

const LIST_STALE_TIME = 2 * 60 * 1000 // 2 minutes
const DETAIL_STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CATEGORY_STALE_TIME = 10 * 60 * 1000 // 10 minutes

/** Resolve a `local-<n>` id against the bundled static catalog. */
export const findLocalGun = (id) => {
  const match = /^local-(\d+)$/.exec(String(id))
  if (!match) return null
  const gun = GUNS_LOCAL[Number(match[1])]
  return gun ? { ...gun, id: gun.id || `local-${match[1]}` } : null
}

// ---------------------------------------------------------------------------
// useGuns — fetch one page of the product list (cached per params).
//
// Returns { guns, loading, error, pagination, refetch, isFetching,
//           isPlaceholderData }.
// While a new page loads, the previous page stays on screen
// (`isPlaceholderData` is true) instead of flashing an empty grid.
// ---------------------------------------------------------------------------
export function useGuns(params = {}, { enabled = true } = {}) {
  const { data, error, isLoading, isFetching, isPlaceholderData, refetch } = useQuery(
    gunKeys.list(params),
    async () => {
      const response = await gunService.getGuns(params)
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch products.')
      }
      return response
    },
    { staleTime: LIST_STALE_TIME, keepPreviousData: true, enabled },
  )

  return {
    guns: data?.data || [],
    loading: isLoading,
    error: error ? error.message || 'An error occurred while fetching products.' : null,
    pagination: data?.pagination || null,
    isFetching,
    isPlaceholderData,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useGunCategories — distinct product types for the filter pills.
// ---------------------------------------------------------------------------
export function useGunCategories() {
  const { data } = useQuery(gunKeys.categories, () => gunService.getCategories(), {
    staleTime: CATEGORY_STALE_TIME,
  })
  return data || null
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product (cached per id).
//
// Returns { gun, loading, error, refetch }.
// `local-<n>` ids are resolved from the bundled catalog without a request.
// ---------------------------------------------------------------------------
export function useGunById(id) {
  const { data, error, isLoading, refetch } = useQuery(
    gunKeys.detail(id),
    async () => {
      const local = findLocalGun(id)
      if (local) return local
      const response = await gunService.getGunById(id)
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Product not found.')
      }
      return response.data
    },
    { staleTime: DETAIL_STALE_TIME, enabled: Boolean(id) },
  )

  return {
    gun: data || null,
    loading: isLoading,
    error: error ? error.message || 'Failed to load product details.' : null,
    refetch,
  }
}
