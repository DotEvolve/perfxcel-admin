import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface StatusOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusOptions?: StatusOption[];
  status?: string;
  onStatusChange?: (v: string) => void;
  dateFrom?: string;
  onDateFromChange?: (v: string) => void;
  dateTo?: string;
  onDateToChange?: (v: string) => void;
  onClear: () => void;
  children?: React.ReactNode; // page-specific extras (e.g. course dropdown)
}

export default function FilterBar({
  search,
  onSearchChange,
  statusOptions,
  status,
  onStatusChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
  children,
}: FilterBarProps) {
  // Debounced search — fires onSearchChange 300ms after typing stops
  const [localSearch, setLocalSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch]);
  // Sync external clear
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const hasActiveFilters =
    !!search || (!!status && status !== "all") || !!dateFrom || !!dateTo;

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Status dropdown */}
      {statusOptions && onStatusChange && (
        <select
          value={status ?? "all"}
          onChange={(e) => onStatusChange(e.target.value)}
          className="border border-gray-300 rounded-md text-sm py-2 px-3 bg-white focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {/* Date range */}
      {onDateFromChange && (
        <input
          type="date"
          value={dateFrom ?? ""}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
        />
      )}
      {onDateToChange && (
        <input
          type="date"
          value={dateTo ?? ""}
          onChange={(e) => onDateToChange(e.target.value)}
          className="border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
        />
      )}

      {/* Page-specific extras */}
      {children}

      {/* Active filters badge + clear */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100"
        >
          <X className="w-3.5 h-3.5" /> Clear filters
        </button>
      )}
    </div>
  );
}
