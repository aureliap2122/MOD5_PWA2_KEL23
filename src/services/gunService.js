import { apiClient, IS_SUPABASE } from '../config/api'
import { invalidateQueries } from '../lib/queryCache'

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape whether received from Supabase
// (public.products) or from the university API (/api/v1/recipes).
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve specifications from Supabase `specs` (text array) or API `ingredients`
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : ['Verify firearm is completely unloaded and point in safe direction.', 'Inspect receiver and mechanism for maintenance.']

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: item.image_url || item.image || '/guns/pistol.svg',
    image: item.image_url || item.image || '/guns/pistol.svg',
    ingredients: specsList,
    steps: stepsList,
  }
}

// ---------------------------------------------------------------------------
// Pagination metadata. `total` may be null when the server does not report a
// count; in that case `hasNext` is guessed from whether the page came back full.
// ---------------------------------------------------------------------------
export const buildPagination = ({ total, page, limit, count }) => {
  const totalPages = total == null ? null : Math.max(1, Math.ceil(total / limit))
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: totalPages == null ? count >= limit : page < totalPages,
  }
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints.
// Supports both Supabase PostgREST table (/rest/v1/products) and
// standard REST API (/api/v1/recipes).
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch one page of the product list (server-side pagination).
   *
   * @param {Object} params
   * @param {number} [params.page=1]    1-based page number
   * @param {number} [params.limit=50]  page size
   * @param {string} [params.search]    matches name or description
   * @param {string} [params.category]  product type, 'All' = no filter
   * @param {string} [params.sort_by]   'name' | 'price'
   * @param {'asc'|'desc'} [params.order]
   * @returns {Promise<{success: boolean, data: Object[], pagination: {
   *   total: number|null, page: number, limit: number,
   *   totalPages: number|null, hasNext: boolean}}>}
   */
  async getGuns(params = {}) {
    const limit = Math.max(1, Number(params.limit) || 50)
    const page = Math.max(1, Number(params.page) || 1)

    if (IS_SUPABASE) {
      const offset = (page - 1) * limit
      const queryParts = ['select=*']

      const search = (params.search || '').trim().replace(/[,()*%\\]/g, ' ')
      if (search) {
        const term = `*${search}*`
        queryParts.push(
          `or=${encodeURIComponent(`(name.ilike.${term},description.ilike.${term})`)}`,
        )
      }

      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }

      // `id` is the tie-breaker so rows never jump between pages.
      if (params.sort_by) {
        const order = params.order === 'desc' ? 'desc' : 'asc'
        queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order},id.asc`)
      } else {
        queryParts.push('order=created_at.desc,id.asc')
      }

      queryParts.push(`limit=${limit}`, `offset=${offset}`)

      const res = await apiClient.get(`/rest/v1/products?${queryParts.join('&')}`, {
        headers: { Prefer: 'count=exact' },
        rawResponse: true,
      })
      const list = Array.isArray(res.data) ? res.data.map(normalizeProduct) : []

      // Content-Range looks like "0-7/23" (or "*/0" for an empty page).
      const range = res.headers?.['content-range'] || res.headers?.get?.('content-range')
      const parsedTotal = range ? Number(String(range).split('/')[1]) : NaN
      return {
        success: true,
        data: list,
        pagination: buildPagination({
          total: Number.isFinite(parsedTotal) ? parsedTotal : null,
          page,
          limit,
          count: list.length,
        }),
      }
    }

    // Fallback: university REST API
    const clean = Object.fromEntries(
      Object.entries({ ...params, page, limit }).filter(([, v]) => v !== '' && v != null && v !== 'All'),
    )
    const res = await apiClient.get('/api/v1/recipes', { params: clean })
    const list = Array.isArray(res?.data) ? res.data : []
    const p = res?.pagination || {}
    const total = p.total ?? p.total_items ?? p.totalItems ?? null
    return {
      ...res,
      data: list,
      pagination: buildPagination({
        total: total == null ? null : Number(total),
        page: Number(p.page) || page,
        limit: Number(p.limit) || limit,
        count: list.length,
      }),
    }
  }

  /**
   * Distinct product types for the category pills ('All' first).
   * Independent of the current page, so pills do not change while paging.
   */
  async getCategories() {
    let types = []
    if (IS_SUPABASE) {
      const rows = await apiClient.get('/rest/v1/products?select=type')
      types = Array.isArray(rows) ? rows.map((r) => r.type) : []
    } else {
      const res = await apiClient.get('/api/v1/recipes', { params: { limit: 100 } })
      types = Array.isArray(res?.data) ? res.data.map((r) => r.type || r.category) : []
    }
    const unique = Array.from(new Set(types.filter(Boolean))).sort()
    return ['All', ...unique]
  }

  /**
   * Fetch a single product by ID.
   */
  async getGunById(id) {
    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        return { success: true, data: normalizeProduct(data[0]) }
      }
      throw new Error('Hardware item not found.')
    }
    return apiClient.get(`/api/v1/recipes/${id}`)
  }

  /**
   * Create a new product.
   */
  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        image_url: data.image_url || null,
      }

      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res
      invalidateQueries(['guns'])
      return { success: true, data: normalizeProduct(created) }
    }
    const created = await apiClient.post('/api/v1/recipes', data)
    invalidateQueries(['guns'])
    return created
  }

  /**
   * Update existing product.
   */
  async updateGun(id, data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : undefined

      const payload = {
        updated_at: new Date().toISOString(),
      }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (specsArray !== undefined) payload.specs = specsArray
      if (data.image_url !== undefined) payload.image_url = data.image_url

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      const updated = Array.isArray(res) ? res[0] : res
      invalidateQueries(['guns'])
      return { success: true, data: normalizeProduct(updated) }
    }
    const updated = await apiClient.put(`/api/v1/recipes/${id}`, data)
    invalidateQueries(['guns'])
    return updated
  }

  /**
   * Partial update (PATCH).
   */
  async patchGun(id, data) {
    if (IS_SUPABASE) {
      return this.updateGun(id, data)
    }
    const patched = await apiClient.patch(`/api/v1/recipes/${id}`, data)
    invalidateQueries(['guns'])
    return patched
  }

  /**
   * Delete product.
   */
  async deleteGun(id) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      invalidateQueries(['guns'])
      return { success: true }
    }
    const removed = await apiClient.delete(`/api/v1/recipes/${id}`)
    invalidateQueries(['guns'])
    return removed
  }
}

export default new GunService()
