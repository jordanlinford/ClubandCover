import { type ReactNode } from 'react';
import { cn } from './utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  striped?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  className,
  striped = false,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border', className)}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card/95 backdrop-blur-lg border-b">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'h-14 px-4 text-left font-medium text-muted-foreground',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={index}
                className={cn(
                  'h-14 border-b hover:bg-muted/50 transition-colors',
                  striped && index % 2 === 1 && 'bg-muted/20'
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4', column.className)}>
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
