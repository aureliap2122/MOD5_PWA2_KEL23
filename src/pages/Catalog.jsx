import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Loader, PackageOpen } from 'lucide-react'
import { useGuns, useGunCategories } from '../hooks/useGuns'
import { useDebounce } from '../hooks/useDebounce'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import AdvancedFilter from '../components/common/AdvancedFilter'
import Pagination from '../components/common/Pagination'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
  paginate,
} from '../utils/helpers'

export const CATALOG_PAGE_SIZE = 9

export const DEFAULT_CATALOG_VIEW = Object.freeze({
  search: '',
  category: 'All',
  sortKey: 'name',
  sortOrder: 'asc',
  page: 1,
})

// Static catalog used when the server cannot be reached.
const LOCAL_CATALOG = GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))

/**
 * Catalog page — the main product listing.
 *
 * Data source priority:
 *   1. Live API, ONE PAGE AT A TIME (server-side pagination, search, filter
 *      and sort), cached per query by useGuns().
 *   2. Local static array (GUNS_LOCAL) when the API is unreachable; it is
 *      filtered, sorted and paginated in the browser.
 *
 * The filter / page state is owned by the parent (`view`) so it survives
 * opening a product and coming back.
 */
export default function Catalog({ onNavigate, view = DEFAULT_CATALOG_VIEW, onViewChange }) {
  const { search, category, sortKey, sortOrder, page } = view
  const setView = (patch) => onViewChange({ ...view, ...patch })

  // Search is debounced so we do not hit the API on every keystroke.
  const [searchInput, setSearchInput] = useState(search)
  const debouncedSearch = useDebounce(searchInput, 350)
  useEffect(() => {
    if (debouncedSearch !== search) onViewChange({ ...view, search: debouncedSearch, page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // Once the server fails we switch to the bundled catalog and stay there
  // (no spinner flicker on every filter change) until "Retry server" is pressed.
  const [serverDown, setServerDown] = useState(false)

  // ---- API data (one page) ----
  const {
    guns: apiGuns,
    loading,
    error,
    pagination: apiPagination,
    isFetching,
    isPlaceholderData,
    refetch,
  } = useGuns({
    page,
    limit: CATALOG_PAGE_SIZE,
    search,
    category,
    sort_by: sortKey,
    order: sortOrder,
  }, { enabled: !serverDown })
  const remoteCategories = useGunCategories()

  useEffect(() => {
    if (error && apiGuns.length === 0) setServerDown(true)
  }, [error, apiGuns.length])

  const offline = serverDown

  // ---- local fallback: filter + sort + paginate in the browser ----
  const local = useMemo(() => {
    if (!offline) return null
    const filtered = sortItems(
      LOCAL_CATALOG.filter((g) => matchesSearch(g, search) && matchesCategory(g, category)),
      sortKey,
      sortOrder,
    )
    return paginate(filtered, page, CATALOG_PAGE_SIZE)
  }, [offline, search, category, sortKey, sortOrder, page])

  const guns = offline ? local.items : apiGuns
  const pagination = offline ? local.pagination : apiPagination
  const categories = useMemo(
    () => (offline ? extractCategories(LOCAL_CATALOG) : remoteCategories || extractCategories(apiGuns)),
    [offline, remoteCategories, apiGuns],
  )

  // Keep the page number valid (e.g. after deleting the last item of the last page).
  useEffect(() => {
    if (pagination?.totalPages && page > pagination.totalPages) {
      onViewChange({ ...view, page: pagination.totalPages })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.totalPages])

  const pageOutOfRange = Boolean(pagination?.totalPages && page > pagination.totalPages)

  // ---- paging ----
  const listRef = useRef(null)
  const goToPage = (next) => {
    setView({ page: next })
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ---- delete ----
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError('')
      await gunService.deleteGun(deleteTarget.id) // also invalidates the cache
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const total = pagination?.total
  const countLabel =
    total != null
      ? `${total} piece${total !== 1 ? 's' : ''}`
      : `${guns.length} piece${guns.length !== 1 ? 's' : ''} on this page`
  const firstShown = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section ref={listRef} className="catalog-list">
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">{countLabel}</span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={searchInput}
          onSearch={setSearchInput}
          categories={categories}
          activeCategory={category}
          onCategory={(c) => setView({ category: c, page: 1 })}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => setView({ sortKey: key, sortOrder: order, page: 1 })}
        />

        {/* States */}
        {loading && !offline && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {guns.length === 0 && !pageOutOfRange && (offline || (!loading && !isFetching && !error)) && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search.</p>
          </div>
        )}

        {/* Product grid */}
        {guns.length > 0 && (
          <>
            <ul
              className={`stock${isPlaceholderData ? ' stock--loading' : ''}`}
              aria-busy={isFetching}
            >
              {guns.map((gun) => (
                <GunCard
                  key={gun.id || gun.name}
                  gun={gun}
                  onSelect={(g) => onNavigate && onNavigate('Detail', g)}
                  onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                  onDelete={setDeleteTarget}
                />
              ))}
            </ul>

            <div className="catalog-footer">
              <p className="catalog-range" aria-live="polite">
                {total != null
                  ? `Showing ${firstShown}–${firstShown + guns.length - 1} of ${total}`
                  : `Showing ${guns.length} on page ${page}`}
                {isFetching && !loading && <Loader size={14} className="spin" aria-label="Updating" />}
              </p>
              <Pagination
                page={pagination?.page || page}
                totalPages={pagination?.totalPages ?? null}
                hasNext={pagination?.hasNext}
                onPageChange={goToPage}
                disabled={isPlaceholderData}
              />
            </div>
          </>
        )}

        {offline && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setServerDown(false); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
      {deleteError && (
        <div className="toast toast--error">{deleteError}</div>
      )}
    </>
  )
}
