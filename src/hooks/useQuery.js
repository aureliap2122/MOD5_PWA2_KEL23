import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import {
  DEFAULT_STALE_TIME,
  ensureQuery,
  getSnapshot,
  serializeKey,
  subscribe,
} from '../lib/queryCache'

// ---------------------------------------------------------------------------
// useQuery — read a cached async resource.
//
//   const { data, error, isLoading, isFetching, isPlaceholderData, refetch } =
//     useQuery(['guns', 'list', params], () => gunService.getGuns(params))
//
// • The fetcher must resolve to something other than `undefined`.
// • `keepPreviousData` keeps showing the previous key's data while the new
//   key loads (used for paginated lists so the grid does not flash empty).
// ---------------------------------------------------------------------------

export function useQuery(key, fetcher, options = {}) {
  const {
    staleTime = DEFAULT_STALE_TIME,
    enabled = true,
    keepPreviousData = false,
    retries = 1,
  } = options

  const keyStr = serializeKey(key)
  const fetcherRef = useRef(fetcher)
  const keyRef = useRef(key)
  useEffect(() => {
    fetcherRef.current = fetcher
    keyRef.current = key
  })

  const subscribeToKey = useCallback((cb) => subscribe(keyStr, cb), [keyStr])
  const readSnapshot = useCallback(() => getSnapshot(keyStr), [keyStr])
  const entry = useSyncExternalStore(subscribeToKey, readSnapshot, readSnapshot)

  // Load / reload when the key changes, when the entry was invalidated,
  // or when it went stale before this component mounted.
  const lastKey = useRef(null)
  useEffect(() => {
    if (!enabled) return
    const keyChanged = lastKey.current !== keyStr
    lastKey.current = keyStr
    ensureQuery(keyRef.current, () => fetcherRef.current(), {
      staleTime,
      retries,
      retryError: keyChanged,
    })
  }, [keyStr, enabled, staleTime, retries, entry.version])

  // Remember the last successfully loaded data for `keepPreviousData`.
  const previous = useRef(undefined)
  useEffect(() => {
    if (entry.data !== undefined) previous.current = entry.data
  }, [entry.data])

  const refetch = useCallback(
    () => ensureQuery(keyRef.current, () => fetcherRef.current(), { force: true, retries }),
    [retries],
  )

  const showPrevious =
    keepPreviousData && entry.data === undefined && !entry.error && previous.current !== undefined
  const data = showPrevious ? previous.current : entry.data

  return {
    data,
    error: entry.error,
    isLoading: enabled && data === undefined && !entry.error,
    isFetching: entry.fetching,
    isPlaceholderData: showPrevious,
    refetch,
  }
}

export default useQuery
