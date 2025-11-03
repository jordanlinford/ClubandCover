import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { api } from '../../lib/api';
import type { Book } from '@repo/types';

export function BooksListPage() {
  const { data: books, isLoading } = useQuery<Book[]>({
    queryKey: ['/api/books'],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <PageHeader
            title="Books"
            description="Browse and manage your book collection"
          />
          <Link href="/books/new">
            <Button data-testid="button-add-book">Add Book</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : books && books.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`}>
                <Card
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`card-book-${book.id}`}
                >
                  <h3 className="font-semibold text-lg mb-1" data-testid={`text-title-${book.id}`}>
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    by {book.author}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      book.isAvailable
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {book.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {book.condition}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No books yet. Add your first book to get started!
            </p>
            <Link href="/books/new">
              <Button data-testid="button-add-first-book">Add Your First Book</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
