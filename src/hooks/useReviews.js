import { useState } from 'react'
import { useQuery } from './useQuery'
import reviewService from '../services/reviewService'
import { invalidateQueries } from '../lib/queryCache'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product (cached per product).
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const { data, error, isLoading, refetch } = useQuery(
    ['reviews', String(gunId)],
    async () => {
      const response = await reviewService.getReviews(gunId)
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch reviews.')
      }
      return response.data || []
    },
    { enabled: Boolean(gunId), staleTime: 60 * 1000 },
  )

  return {
    reviews: data || [],
    loading: isLoading,
    error: error ? error.message || 'An error occurred while fetching reviews.' : null,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review for a product.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await reviewService.createReview(gunId, reviewData)

      if (response.success) {
        setSuccess(true)
        // The cached review list for this product is now outdated.
        invalidateQueries(['reviews', String(gunId)])
        return response.data
      } else {
        setError(response.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}
