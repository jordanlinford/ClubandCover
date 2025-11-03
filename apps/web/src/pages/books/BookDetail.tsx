import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { Book } from '@repo/types';

export function BookDetailPage() {
  const [match, params] = useRoute('/books/:id');
  const bookId = params?.id;

  const { data: book, isLoading } = useQuery<Book>({
    queryKey: ['/api/books', bookId],
    enabled: !!bookId,
  });

  if (!match || !bookId) {
    return <div>Book not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Link href="/books">
          <Button variant="outline" className="mb-4" data-testid="button-back">
            ← Back to Books
          </Button>
        </Link>

        {isLoading ? (
          <Card className="p-8 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </Card>
        ) : book ? (
          <>
            <PageHeader
              title={book.title}
              description={`by ${book.author}`}
            />

            <div className="mt-6 grid gap-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Book Details</h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Author
                    </dt>
                    <dd className="text-base" data-testid="text-author">{book.author}</dd>
                  </div>
                  {book.isbn && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        ISBN
                      </dt>
                      <dd className="text-base">{book.isbn}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Condition
                    </dt>
                    <dd className="text-base" data-testid="text-condition">{book.condition}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Availability
                    </dt>
                    <dd>
                      <span className={`inline-block px-2 py-1 rounded text-sm ${
                        book.isAvailable
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`} data-testid="status-availability">
                        {book.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </dd>
                  </div>
                  {book.description && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Description
                      </dt>
                      <dd className="text-base mt-1">{book.description}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-6 flex space-x-3">
                  <Link href={`/books/${book.id}/edit`}>
                    <Button data-testid="button-edit">Edit Book</Button>
                  </Link>
                  <Button variant="outline" data-testid="button-request-swap">
                    Request Swap
                  </Button>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Book not found</p>
            <Link href="/books">
              <Button className="mt-4" data-testid="button-back-to-list">
                Back to Books
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
