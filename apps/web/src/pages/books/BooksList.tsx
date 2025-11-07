import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import type { Book } from '@repo/types';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export function BooksListPage() {
  const { user } = useAuth();
  const isAuthor = user?.role === 'AUTHOR';
  
  const { data: books, isLoading } = useQuery<Book[]>({
    queryKey: ['/api/books'],
    enabled: isAuthor,
  });

  if (!isAuthor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Author-Only Feature</h2>
            <p className="text-muted-foreground mb-6">
              The AuthorSwap book collection is available for authors only. This feature allows authors to exchange physical books with other authors for reviews.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>As a reader, you can:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Join book clubs and vote on pitches</li>
                <li>Discover new books through community recommendations</li>
                <li>Earn points and badges for participation</li>
              </ul>
            </div>
            <div className="mt-6">
              <Link href="/discover">
                <Button data-testid="button-go-discover">
                  Explore Books & Clubs
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <PageHeader
            title="My Books"
            description="Manage your book collection for AuthorSwap"
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
              No books in your AuthorSwap collection yet. Add your first book to start exchanging with other authors!
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
