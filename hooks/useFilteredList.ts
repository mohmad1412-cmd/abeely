import { useMemo, useState } from 'react';

type FilterConfig<T> = {
  id: string;
  icon: React.ReactNode;
  options: Array<{ value: string; label: string; count?: number; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  getLabel: () => string;
  showCount?: boolean;
};

export function useFilteredList<T>(
  items: T[],
  archivedItems: T[],
  filterConfig: {
    all: (items: T[], archived: T[]) => T[];
    [key: string]: (items: T[], archived: T[]) => T[];
  },
  searchFields: Array<keyof T>,
  defaultFilter: string = 'all'
) {
  const [filter, setFilter] = useState<string>(defaultFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filtered = useMemo(() => {
    let result: T[] = [];
    
    if (filter === 'all') {
      result = filterConfig.all(items, archivedItems);
    } else if (filterConfig[filter]) {
      result = filterConfig[filter](items, archivedItems);
    } else {
      result = items;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(term);
        })
      );
    }

    return result;
  }, [items, archivedItems, filter, searchTerm, filterConfig, searchFields]);

  return {
    filtered,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    isSearchOpen,
    setIsSearchOpen,
  };
}

