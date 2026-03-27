import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-lg text-muted-foreground">
        {start}–{end} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-12 w-12 p-0 rounded-xl"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-medium min-w-[80px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-12 w-12 p-0 rounded-xl"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export function usePagination<T>(items: T[], itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Reset to page 1 when items change significantly
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  
  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }

  const paginatedItems = items.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  return {
    paginatedItems,
    currentPage: safePage,
    setCurrentPage,
    totalItems: items.length,
    itemsPerPage,
  };
}

import { useState } from 'react';
