/**
 * @fileoverview src/components/Pagination.tsx
 * Pagination component with smart page range calculation and ellipsis
 */

import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
    queryParams: URLSearchParams;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export default function Pagination({
    currentPage,
    totalPages,
    baseUrl,
    queryParams,
    hasNextPage,
    hasPreviousPage,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const getPageUrl = (page: number) => {
        const params = new URLSearchParams(queryParams);
        params.set("page", page.toString());
        return `${baseUrl}?${params.toString()}`;
    };

    const getVisiblePages = () => {
        // Business logic: Smart page range calculation with ellipsis
        const delta = 2; // Number of pages to show on each side of current page
        const range = [];
        const rangeWithDots = [];

        for (
            let i = Math.max(2, currentPage - delta);
            i <= Math.min(totalPages - 1, currentPage + delta);
            i++
        ) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, "...");
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push("...", totalPages);
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    return (
        <div className="flex items-center justify-center mt-6">
            <ShadcnPagination>
                <PaginationContent>
                    {/* Previous Button */}
                    <PaginationItem>
                        {hasPreviousPage ? (
                            <PaginationPrevious href={getPageUrl(currentPage - 1)} />
                        ) : (
                            <PaginationPrevious href="#" className="pointer-events-none opacity-50" />
                        )}
                    </PaginationItem>

                    {/* Page Numbers */}
                    {getVisiblePages().map((page, index) => {
                        if (page === "...") {
                            return (
                                <PaginationItem key={`dots-${index}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            );
                        }

                        const pageNum = page as number;
                        const isCurrentPage = pageNum === currentPage;

                        return (
                            <PaginationItem key={pageNum}>
                                <PaginationLink
                                    href={getPageUrl(pageNum)}
                                    isActive={isCurrentPage}
                                >
                                    {pageNum}
                                </PaginationLink>
                            </PaginationItem>
                        );
                    })}

                    {/* Next Button */}
                    <PaginationItem>
                        {hasNextPage ? (
                            <PaginationNext href={getPageUrl(currentPage + 1)} />
                        ) : (
                            <PaginationNext href="#" className="pointer-events-none opacity-50" />
                        )}
                    </PaginationItem>
                </PaginationContent>
            </ShadcnPagination>
        </div>
    );
}
