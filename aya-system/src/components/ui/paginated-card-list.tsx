import React, { ReactNode } from 'react';

export interface PaginatedCardListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  ariaLabels: {
    prev: string;
    next: string;
    pagesIndicator: string;
    pagination: string;
    page: string; // singular base label e.g. صفحة / Page
  };
  className?: string;
  navigationPosition?: 'top' | 'bottom' | 'both';
  hideIfSinglePage?: boolean;
  dotsVariant?: 'filled' | 'outline';
  /** Optional header node (e.g., title bar) rendered above everything */
  header?: ReactNode;
  /** Optional search / controls area rendered below header and above list */
  searchBar?: ReactNode;
  /** Wrapper extra classes for outer container */
  containerClassName?: string;
  /** Classes for the items wrapper (list body) */
  bodyClassName?: string;
}

export function PaginatedCardList<T>(props: PaginatedCardListProps<T>) {
  const {
    items,
    renderItem,
    pageSize,
    page,
    onPageChange,
    ariaLabels,
    className = '',
    navigationPosition = 'bottom',
    hideIfSinglePage = true,
    dotsVariant = 'filled',
    header,
    searchBar,
    containerClassName = '',
    bodyClassName = ''
  } = props;

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;
  const paged = items.slice(page * pageSize, page * pageSize + pageSize);

  const Nav = () => {
    if (hideIfSinglePage && totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-3" aria-label={ariaLabels.pagination}>
        <button
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className="p-2 rounded-full bg-green-100 hover:bg-green-200 disabled:opacity-40 disabled:hover:bg-green-100 text-green-700 transition"
          aria-label={ariaLabels.prev}
          type="button"
        >
          <span className="sr-only">{ariaLabels.prev}</span>
          {/* RTL: previous == move back => arrow points RIGHT */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        </button>
        <div className="flex items-center gap-1" aria-label={ariaLabels.pagesIndicator}>
          {Array.from({ length: totalPages }).map((_, i) => {
            const active = i === page;
            return (
              <button
                key={i}
                onClick={() => onPageChange(i)}
                aria-label={`${ariaLabels.page} ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  active
                    ? 'bg-green-600 ring-2 ring-green-300'
                    : dotsVariant === 'outline'
                      ? 'bg-white border border-green-400 hover:bg-green-100'
                      : 'bg-green-200 hover:bg-green-300'
                }`}
                type="button"
              />
            );
          })}
        </div>
        <button
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className="p-2 rounded-full bg-green-100 hover:bg-green-200 disabled:opacity-40 disabled:hover:bg-green-100 text-green-700 transition"
          aria-label={ariaLabels.next}
          type="button"
        >
          <span className="sr-only">{ariaLabels.next}</span>
          {/* RTL: next == move forward => arrow points LEFT */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        </button>
      </div>
    );
  };

  return (
    <div className={`${containerClassName} ${className}`.trim()}>
      {header && (
        <div className="mb-2 last:mb-0">
          {header}
        </div>
      )}
      {searchBar && (
        <div className="mb-3 last:mb-0">
          {searchBar}
        </div>
      )}
      {(navigationPosition === 'top' || navigationPosition === 'both') && <Nav />}
      <div className={`flex flex-col gap-2 ${bodyClassName}`.trim()}>
        {paged.map((item, idx) => renderItem(item, page * pageSize + idx))}
      </div>
      {(navigationPosition === 'bottom' || navigationPosition === 'both') && <Nav />}
    </div>
  );
}

export default PaginatedCardList;