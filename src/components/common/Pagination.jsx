import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPageItems } from '../../utils/helpers'

/**
 * Pager with Prev / Next and numbered pages.
 *
 * If the server did not report a total (`totalPages` null) only Prev / Next
 * are shown and `hasNext` decides whether Next is enabled.
 *
 * @param {Object}   props
 * @param {number}   props.page          current page (1-based)
 * @param {number|null} props.totalPages
 * @param {boolean}  [props.hasNext]
 * @param {Function} props.onPageChange  (page) => void
 * @param {boolean}  [props.disabled]    e.g. while a page is loading
 */
export default function Pagination({ page, totalPages, hasNext, onPageChange, disabled = false }) {
  if (totalPages != null && totalPages <= 1) return null
  if (totalPages == null && page <= 1 && !hasNext) return null

  const canPrev = page > 1
  const canNext = totalPages != null ? page < totalPages : Boolean(hasNext)
  const go = (n) => {
    if (!disabled && n !== page) onPageChange(n)
  }

  return (
    <nav className="pagination" aria-label="Catalog pages">
      <button
        type="button"
        className="pagination__btn"
        onClick={() => go(page - 1)}
        disabled={disabled || !canPrev}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} /> <span className="pagination__text">Prev</span>
      </button>

      {totalPages != null ? (
        <ul className="pagination__pages">
          {getPageItems(page, totalPages).map((item, i) =>
            item === '…' ? (
              <li key={`gap-${i}`} className="pagination__gap" aria-hidden="true">…</li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  className={`pagination__btn pagination__num${item === page ? ' pagination__btn--active' : ''}`}
                  onClick={() => go(item)}
                  disabled={disabled && item !== page}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? 'page' : undefined}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>
      ) : (
        <span className="pagination__status">Page {page}</span>
      )}

      <button
        type="button"
        className="pagination__btn"
        onClick={() => go(page + 1)}
        disabled={disabled || !canNext}
        aria-label="Next page"
      >
        <span className="pagination__text">Next</span> <ChevronRight size={16} />
      </button>
    </nav>
  )
}
