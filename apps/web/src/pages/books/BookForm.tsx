import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { api } from '../../lib/api';
import type { Book, CreateBook, BookCondition } from '@repo/types';

const CONDITIONS: BookCondition[] = ['NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE'];

export function BookFormPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/books/:id/edit');
  const isEdit = !!match;
  const bookId = params?.id;
  const queryClient = useQueryClient();

  const { data: book } = useQuery<Book>({
    queryKey: ['/api/books', bookId],
    enabled: isEdit && !!bookId,
  });

  const [formData, setFormData] = useState<CreateBook>({
    title: '',
    subtitle: undefined,
    author: '',
    genres: [],
    isbn: undefined,
    description: undefined,
    condition: 'GOOD',
    imageUrl: undefined,
  });

  // Sync form data when book loads
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        subtitle: book.subtitle || undefined,
        author: book.author,
        genres: book.genres || [],
        isbn: book.isbn || undefined,
        description: book.description || undefined,
        condition: book.condition,
        imageUrl: book.imageUrl || undefined,
      });
    }
  }, [book]);

  const createMutation = useMutation({
    mutationFn: (data: CreateBook) => api.createBook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      setLocation('/books');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateBook>) =>
      api.updateBook(bookId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      setLocation(`/books/${bookId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-6">
        <PageHeader
          title={isEdit ? 'Edit Book' : 'Add New Book'}
          description={isEdit ? 'Update book information' : 'Add a new book to your collection'}
        />

        <Card className="p-6 mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Title *
              </label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="input-title"
              />
            </div>

            <div>
              <label htmlFor="author" className="block text-sm font-medium mb-2">
                Author *
              </label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                required
                data-testid="input-author"
              />
            </div>

            <div>
              <label htmlFor="isbn" className="block text-sm font-medium mb-2">
                ISBN
              </label>
              <Input
                id="isbn"
                value={formData.isbn || ''}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value || undefined })}
                data-testid="input-isbn"
              />
            </div>

            <div>
              <label htmlFor="condition" className="block text-sm font-medium mb-2">
                Condition *
              </label>
              <select
                id="condition"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as BookCondition })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                required
                data-testid="select-condition"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 min-h-24"
                data-testid="textarea-description"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit"
              >
                {isPending ? 'Saving...' : isEdit ? 'Update Book' : 'Add Book'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(isEdit ? `/books/${bookId}` : '/books')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
