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

  it('keeps the home page copy unchanged for the pilot', () => {
    render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '我的模块首页' })).toBeInTheDocument();
    expect(screen.getByText('快捷进入常用业务模块。')).toBeInTheDocument();
  });

  it('keeps hero artwork out of inline svg so it can be served as a compressed asset', () => {
    const { container } = render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(container.querySelector('.my-home-hero svg')).toBeNull();
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
});
