import Link from "next/link";

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
        <div className="flex items-center justify-center gap-2 mt-6">
            {/* Previous Button */}
            {hasPreviousPage ? (
                <Link
                    href={getPageUrl(currentPage - 1)}
                    className="btn btn-outline btn-sm"
                >
                    ← Previous
                </Link>
            ) : (
                <span className="btn btn-outline btn-sm opacity-50 cursor-not-allowed">
                    ← Previous
                </span>
            )}

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
                {getVisiblePages().map((page, index) => {
                    if (page === "...") {
                        return (
                            <span key={`dots-${index}`} className="px-3 py-1 text-gray-500">
                                ...
                            </span>
                        );
                    }

                    const pageNum = page as number;
                    const isCurrentPage = pageNum === currentPage;

                    return (
                        <Link
                            key={pageNum}
                            href={getPageUrl(pageNum)}
                            className={`btn btn-sm ${
                                isCurrentPage
                                    ? "btn-primary"
                                    : "btn-outline"
                            }`}
                        >
                            {pageNum}
                        </Link>
                    );
                })}
            </div>

            {/* Next Button */}
            {hasNextPage ? (
                <Link
                    href={getPageUrl(currentPage + 1)}
                    className="btn btn-outline btn-sm"
                >
                    Next →
                </Link>
            ) : (
                <span className="btn btn-outline btn-sm opacity-50 cursor-not-allowed">
                    Next →
                </span>
            )}
        </div>
    );
}
