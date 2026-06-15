import { Button } from 'antd';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResponsiveTable } from './ResponsiveTable';

function setMobileViewport(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches,
      media: '(max-width: 1279px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe('ResponsiveTable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows every column as a labeled field on mobile', () => {
    setMobileViewport(true);

    render(
      <ResponsiveTable
        rowKey="id"
        pagination={false}
        dataSource={[{ id: '1', title: '采购申请', status: '待审批' }]}
        columns={[
          { title: '标题', dataIndex: 'title', key: 'title' },
          { title: '状态', dataIndex: 'status', key: 'status' },
          {
            title: '操作',
            key: 'actions',
            render: () => <Button>查看详情</Button>,
          },
        ]}
      />,
    );

    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.getByText('采购申请')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('待审批')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看详情' })).toBeInTheDocument();
  });

  it('keeps the normal table header on desktop', () => {
    setMobileViewport(false);

    render(
      <ResponsiveTable
        rowKey="id"
        pagination={false}
        dataSource={[{ id: '1', title: '采购申请' }]}
        columns={[{ title: '标题', dataIndex: 'title', key: 'title' }]}
      />,
    );

    expect(screen.getByRole('columnheader', { name: '标题' })).toBeInTheDocument();
  });
});
