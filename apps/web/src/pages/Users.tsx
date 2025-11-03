import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Button, DataTable, Card } from '@repo/ui';
import type { User } from '@repo/types';
import { api } from '../lib/api';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<User[]>('/users');
      setUsers(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (user: User) => new Date(user.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Users"
          description="Manage users in your application"
          actions={
            <>
              <Link to="/">
                <Button variant="outline">← Back</Button>
              </Link>
              <Button>Add User</Button>
            </>
          }
        />

        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading users...</p>
          </Card>
        ) : error ? (
          <Card className="p-12 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadUsers}>Retry</Button>
          </Card>
        ) : (
          <DataTable data={users} columns={columns} striped />
        )}
      </div>
    </div>
  );
}
