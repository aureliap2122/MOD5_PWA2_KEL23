// ---------------------------------------------------------------------------
// helpers.js — pure utility functions used across the application.
// ---------------------------------------------------------------------------

/**
 * Format a numeric price as "$1,234".
 */
export const formatPrice = (price) => {
  const num = Number(price)
  if (Number.isNaN(num)) return '$0'
  return `$${num.toLocaleString()}`
}

/**
 * Client-side text search — case-insensitive match against name and
 * description.
 */
export const matchesSearch = (item, query) => {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    (item.name || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q)
  )
}

/**
 * Client-side category / type filter.
 * `category` of '' or 'All' matches everything.
 */
export const matchesCategory = (item, category) => {
  if (!category || category === 'All') return true
  // Support both the local `type` field and the backend `category` field
  return (
    (item.type || '').toLowerCase() === category.toLowerCase() ||
    (item.category || '').toLowerCase() === category.toLowerCase()
  )
}

/**
 * Sort an array of items by a given key.
 * @param {'name'|'price'} key
 * @param {'asc'|'desc'}   order
 */
export const sortItems = (items, key = 'name', order = 'asc') => {
  const sorted = [...items].sort((a, b) => {
    if (key === 'price') return (Number(a.price) || 0) - (Number(b.price) || 0)
    return String(a[key] || '').localeCompare(String(b[key] || ''))
  })
  return order === 'desc' ? sorted.reverse() : sorted
}

/**
 * Truncate a string to `max` characters, adding "…" when clipped.
 */
export const truncate = (str, max = 100) => {
  if (!str || str.length <= max) return str || ''
  return str.slice(0, max).trimEnd() + '…'
}

/**
 * Extract unique category values from a list of items.
 * Returns ['All', ...categories].
 */
export const extractCategories = (items) => {
  const set = new Set()
  items.forEach((i) => {
    const cat = i.type || i.category
    if (cat) set.add(cat)
  })
  return ['All', ...Array.from(set).sort()]
}

/**
 * Compute average rating from an array of review objects that each have a
 * numeric `rating` property.  Returns 0 when empty.
 */
export const averageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

/**
 * Slice an in-memory list into one page (used for the offline/local catalog).
 * Returns the page items plus pagination metadata shaped like the API's.
 */
export const paginate = (items, page = 1, limit = 8) => {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const start = (current - 1) * limit
  return {
    items: items.slice(start, start + limit),
    pagination: {
      total,
      page: current,
      limit,
      totalPages,
      hasNext: current < totalPages,
    },
  }
}

/**
 * Page numbers to render in a pager, with '…' gaps. The number of slots stays
 * constant so the pager does not jump around while paging, e.g.
 *   getPageItems(1, 12) → [1, 2, 3, 4, 5, '…', 12]
 *   getPageItems(6, 12) → [1, '…', 5, 6, 7, '…', 12]
 */
export const getPageItems = (page, totalPages, siblings = 1) => {
  if (!totalPages || totalPages < 1) return []
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

  const slots = siblings * 2 + 5 // first, last, current ± siblings, two gaps
  if (totalPages <= slots) return range(1, totalPages)

  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, totalPages)
  const showLeftGap = left > 2
  const showRightGap = right < totalPages - 1
  const edgeCount = siblings * 2 + 3

  if (!showLeftGap && showRightGap) return [...range(1, edgeCount), '…', totalPages]
  if (showLeftGap && !showRightGap) {
    return [1, '…', ...range(totalPages - edgeCount + 1, totalPages)]
  }
  return [1, '…', ...range(left, right), '…', totalPages]
}
