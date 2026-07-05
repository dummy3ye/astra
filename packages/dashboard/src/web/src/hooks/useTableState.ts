import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseTableStateOptions {
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

export function useTableState(opts: UseTableStateOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const sortBy = searchParams.get('sortBy') || opts.defaultSortBy || undefined;
  const sortOrder =
    (searchParams.get('sortOrder') as 'asc' | 'desc') ||
    opts.defaultSortOrder ||
    'asc';
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('q') || '';

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('filter_')) {
        f[key.slice(7)] = value;
      }
    }
    return f;
  }, [searchParams]);

  const dateFrom = searchParams.get('startDate') || undefined;
  const dateTo = searchParams.get('endDate') || undefined;

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const setSortBy = useCallback(
    (field: string) => {
      if (field === sortBy) {
        const next = sortOrder === 'asc' ? 'desc' : 'asc';
        updateParams({ sortBy: field, sortOrder: next, page: undefined });
      } else {
        updateParams({ sortBy: field, sortOrder: 'asc', page: undefined });
      }
    },
    [sortBy, sortOrder, updateParams]
  );

  const clearSort = useCallback(() => {
    updateParams({ sortBy: undefined, sortOrder: undefined });
  }, [updateParams]);

  const setPage = useCallback(
    (n: number) => {
      updateParams({ page: String(n) });
    },
    [updateParams]
  );

  const setSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ q: value || undefined, page: undefined });
      }, 300);
    },
    [updateParams]
  );

  const setFilter = useCallback(
    (field: string, value: string) => {
      updateParams({
        [`filter_${field}`]: value || undefined,
        page: undefined,
      });
    },
    [updateParams]
  );

  const removeFilter = useCallback(
    (field: string) => {
      updateParams({ [`filter_${field}`]: undefined });
    },
    [updateParams]
  );

  const clearFilters = useCallback(() => {
    const updates: Record<string, undefined> = {};
    for (const key of Object.keys(filters)) {
      updates[`filter_${key}`] = undefined;
    }
    updateParams(updates);
  }, [filters, updateParams]);

  const setDateFrom = useCallback(
    (date: string | undefined) => {
      updateParams({ startDate: date || undefined, page: undefined });
    },
    [updateParams]
  );

  const setDateTo = useCallback(
    (date: string | undefined) => {
      updateParams({ endDate: date || undefined, page: undefined });
    },
    [updateParams]
  );

  return {
    sortBy,
    sortOrder,
    page,
    search,
    filters,
    dateFrom,
    dateTo,
    setSortBy,
    clearSort,
    setPage,
    setSearch,
    setFilter,
    removeFilter,
    clearFilters,
    setDateFrom,
    setDateTo,
  };
}
