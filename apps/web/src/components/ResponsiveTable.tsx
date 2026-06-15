import { Table } from 'antd';
import type {
  ColumnGroupType,
  ColumnType,
  ColumnsType,
  TableProps,
} from 'antd/es/table';
import {
  isValidElement,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const mobileTableQuery = '(max-width: 1279px)';

type RenderedCell = {
  children?: ReactNode;
  props?: Record<string, unknown>;
};

function subscribeToMobileTable(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => undefined;
  }

  const query = window.matchMedia(mobileTableQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function isMobileTable() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.(mobileTableQuery).matches)
  );
}

function isRenderedCell(value: unknown): value is RenderedCell {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isValidElement(value) &&
    ('children' in value || 'props' in value)
  );
}

function renderMobileValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  return value as ReactNode;
}

function getColumnLabel<T>(column: ColumnType<T>) {
  if (
    typeof column.title === 'string' ||
    typeof column.title === 'number'
  ) {
    return column.title;
  }

  if (column.key !== undefined) {
    return String(column.key);
  }

  if (Array.isArray(column.dataIndex)) {
    return column.dataIndex.join('.');
  }

  return column.dataIndex ? String(column.dataIndex) : '内容';
}

function makeMobileColumn<T>(
  column: ColumnType<T> | ColumnGroupType<T>,
): ColumnType<T> | ColumnGroupType<T> {
  if ('children' in column && column.children) {
    return {
      ...column,
      children: column.children.map(makeMobileColumn),
    };
  }

  const valueColumn = column as ColumnType<T>;
  const label = getColumnLabel(valueColumn);
  const isActions =
    label === '操作' || String(valueColumn.key ?? '').includes('action');

  return {
    ...valueColumn,
    className: [
      valueColumn.className,
      isActions ? 'responsive-table-actions-cell' : '',
    ]
      .filter(Boolean)
      .join(' '),
    ellipsis: false,
    fixed: undefined,
    width: undefined,
    render: (value, record, index) => {
      const rendered = valueColumn.render
        ? valueColumn.render(value, record, index)
        : value;
      const cell = isRenderedCell(rendered) ? rendered : undefined;
      const content = renderMobileValue(cell ? cell.children : rendered);
      const children = (
        <div className="responsive-table-field">
          <span className="responsive-table-label">{label}</span>
          <div className="responsive-table-value">{content}</div>
        </div>
      );

      return cell ? { ...cell, children } : children;
    },
  };
}

export function ResponsiveTable<T extends object>({
  className,
  columns,
  scroll,
  ...props
}: TableProps<T>) {
  const isMobile = useSyncExternalStore(
    subscribeToMobileTable,
    isMobileTable,
    () => false,
  );
  const mobileColumns = useMemo(
    () => (columns ?? []).map(makeMobileColumn) as ColumnsType<T>,
    [columns],
  );

  return (
    <Table<T>
      {...props}
      className={[
        className,
        isMobile ? 'responsive-table-mobile' : 'responsive-table-desktop',
      ]
        .filter(Boolean)
        .join(' ')}
      columns={isMobile ? mobileColumns : columns}
      scroll={isMobile ? undefined : scroll}
      showHeader={!isMobile}
    />
  );
}
