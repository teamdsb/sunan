import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MyHomePage } from './MyHomePage';

describe('MyHomePage', () => {
  it('renders six grid entries including reminders', () => {
    render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('my-home-entry-my-enterprise-profile')).toHaveAttribute('href', '/my/enterprise-profile');
    expect(screen.getByTestId('my-home-entry-my-enterprise-policy')).toHaveAttribute('href', '/my/enterprise-policy');
    expect(screen.getByTestId('my-home-entry-my-certificates')).toHaveAttribute('href', '/my/certificates');
    expect(screen.getByTestId('my-home-entry-my-reminders')).toHaveAttribute('href', '/my/reminders');
    expect(screen.getByTestId('my-home-entry-my-monitors')).toHaveAttribute('href', '/my/monitors');
    expect(screen.getByTestId('my-home-entry-my-settings')).toHaveAttribute('href', '/my/settings');
  });

  it('renders the blue enterprise card grid hooks', () => {
    render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('my-home-page')).toHaveClass('my-home-page');
    expect(screen.getByTestId('my-home-grid')).toHaveClass('my-home-grid', 'my-home-card-grid');
    expect(screen.getAllByRole('link')).toHaveLength(6);
  });

  it('renders the refreshed command dashboard copy', () => {
    render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '常用业务一屏触达，船务状态集中提醒' })).toBeInTheDocument();
    expect(
      screen.getByText(
        '围绕证照、制度、船舶监控和个人待办重新组织入口，适配桌面与企业微信移动端。',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('今日待办')).toBeInTheDocument();
  });

  it('serves the ship artwork as the command card background instead of a separate image block', () => {
    const { container } = render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(container.querySelector('.my-home-command-hero svg')).toBeNull();
    expect(container.querySelector('.my-home-ship-visual')).toBeNull();
  });

  it('renders enterprise shortcut cards with stable labels', () => {
    render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '企业资料' })).toHaveClass('my-home-shortcut');
    expect(screen.getByRole('link', { name: '电子证照' })).toHaveClass('my-home-shortcut');
  });

  it('renders shortcuts with blue icon plates', () => {
    render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId('my-home-shortcut-icon')).toHaveLength(6);
    expect(screen.getAllByTestId('my-home-shortcut-icon')[0]).toHaveClass('my-home-shortcut-icon', 'my-home-shortcut-icon-blue');
  });

  it('uses the whole shortcut card as the action without rendering redundant view labels', () => {
    const { container } = render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('.my-home-shortcut-action')).toHaveLength(0);
    expect(screen.queryByText('查看')).not.toBeInTheDocument();
  });
});
