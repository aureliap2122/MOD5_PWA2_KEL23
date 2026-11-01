// ---------------------------------------------------------------------------
// queryCache.js — a tiny in-memory query cache (no external dependency).
//
// Behaviour (a small subset of what TanStack Query does):
//   • Every query is identified by a key array, e.g. ['guns', 'list', {page: 2}].
//   • Fresh data (younger than `staleTime`) is served from cache, no request.
//   • Stale data is still shown immediately while a refetch runs in the
//     background ("stale-while-revalidate").
//   • Identical requests that are already in flight are shared (deduplicated).
//   • `invalidate(prefix)` marks every entry whose key starts with `prefix`
//     as stale so mounted components refetch and others refetch on next use.
//   • Entries nobody is subscribed to are garbage-collected after `gcTime`.
// ---------------------------------------------------------------------------

export const DEFAULT_STALE_TIME = 60 * 1000 // 1 minute
export const DEFAULT_GC_TIME = 10 * 60 * 1000 // 10 minutes

const EMPTY_ENTRY = Object.freeze({
  data: undefined,
  error: null,
  updatedAt: 0,
  fetching: false,
  version: 0,
})

/** @type {Map<string, {key: any[], state: object, gen: number, touched: number}>} */
const entries = new Map()
/** @type {Map<string, Set<Function>>} */
const listeners = new Map()
/** @type {Map<string, Promise<any>>} in-flight requests, for deduplication */
const inflight = new Map()

export const serializeKey = (key) => JSON.stringify(key)

const notify = (keyStr) => {
  const subs = listeners.get(keyStr)
  if (subs) subs.forEach((fn) => fn())
}

/** Replace an entry's state with a *new* object so subscribers re-render. */
const patch = (keyStr, key, changes) => {
  const current = entries.get(keyStr)
  const prev = current ? current.state : EMPTY_ENTRY
  const state = { ...prev, ...changes, version: prev.version + 1 }
  entries.set(keyStr, {
    key,
    state,
    gen: current ? current.gen : 0,
    touched: Date.now(),
  })
  notify(keyStr)
}

const prune = () => {
  const now = Date.now()
  for (const [keyStr, entry] of entries) {
    const active = listeners.get(keyStr)
    if ((!active || active.size === 0) && !inflight.has(keyStr) && now - entry.touched > DEFAULT_GC_TIME) {
      entries.delete(keyStr)
    }
  }
}

export const getSnapshot = (keyStr) => entries.get(keyStr)?.state ?? EMPTY_ENTRY

export const subscribe = (keyStr, fn) => {
  let subs = listeners.get(keyStr)
  if (!subs) {
    subs = new Set()
    listeners.set(keyStr, subs)
  }
  subs.add(fn)
  return () => {
    subs.delete(fn)
    if (subs.size === 0) listeners.delete(keyStr)
  }
}

export const isStale = (state, staleTime = DEFAULT_STALE_TIME) =>
  state.data === undefined || Date.now() - state.updatedAt >= staleTime

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Retry once for network problems / 5xx — never for 4xx.
const runWithRetry = async (fetcher, retries) => {
  let attempt = 0
  for (;;) {
    try {
      return await fetcher()
    } catch (err) {
      const status = err && err.status
      const retryable = status == null || status >= 500
      if (attempt >= retries || !retryable) throw err
      attempt += 1
      await sleep(400 * attempt)
    }
  }
}

/**
 * Make sure `key` is loaded. Returns the in-flight (or finished) promise.
 *
 * @param {any[]}    key
 * @param {Function} fetcher       () => Promise<data>
 * @param {Object}   [options]
 * @param {number}   [options.staleTime]
 * @param {boolean}  [options.force]       refetch even when fresh
 * @param {boolean}  [options.retryError]   retry although the last attempt failed
 * @param {number}   [options.retries]
 */
export const ensureQuery = (key, fetcher, options = {}) => {
  const { staleTime = DEFAULT_STALE_TIME, force = false, retryError = false, retries = 1 } = options
  const keyStr = serializeKey(key)
  const state = getSnapshot(keyStr)

  if (inflight.has(keyStr)) return inflight.get(keyStr)
  if (!force && !isStale(state, staleTime)) return Promise.resolve(state.data)
  if (!force && state.error && !retryError) return Promise.resolve(state.data)

  prune()
  const startGen = entries.get(keyStr)?.gen ?? 0
  patch(keyStr, key, { fetching: true, error: null })

  const promise = runWithRetry(fetcher, retries)
    .then((data) => {
      const entry = entries.get(keyStr)
      // If the key was invalidated while we were fetching, the data we got
      // may already be outdated: keep it but leave it marked as stale.
      const outdated = entry && entry.gen !== startGen
      patch(keyStr, key, {
        data,
        error: null,
        fetching: false,
        updatedAt: outdated ? 0 : Date.now(),
      })
      return data
    })
    .catch((error) => {
      patch(keyStr, key, { error, fetching: false })
      throw error
    })
    .finally(() => {
      inflight.delete(keyStr)
    })

  inflight.set(keyStr, promise)
  // Components read the failure from the cache entry; avoid unhandled rejections.
  promise.catch(() => {})
  return promise
}

/** Read cached data without triggering a request. */
export const getQueryData = (key) => getSnapshot(serializeKey(key)).data

/** Write data into the cache (it becomes "fresh"). */
export const setQueryData = (key, data) => {
  patch(serializeKey(key), key, { data, error: null, updatedAt: Date.now() })
}

const startsWith = (key, prefix) =>
  prefix.every((part, i) => JSON.stringify(key[i]) === JSON.stringify(part))

/**
 * Mark every entry whose key begins with `prefix` as stale.
 * Mounted components refetch automatically.
 */
export const invalidateQueries = (prefix = []) => {
  for (const [keyStr, entry] of entries) {
    if (!startsWith(entry.key, prefix)) continue
    entry.gen += 1
    patch(keyStr, entry.key, { updatedAt: 0, error: null })
  }
}

export const clearQueries = () => {
  entries.clear()
  inflight.clear()
}

export const queryCache = {
  ensure: ensureQuery,
  get: getQueryData,
  set: setQueryData,
  invalidate: invalidateQueries,
  clear: clearQueries,
}

export default queryCache
