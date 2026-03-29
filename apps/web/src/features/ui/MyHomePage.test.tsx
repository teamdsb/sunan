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

  it('renders desktop tiles with dedicated square layout hooks', () => {
    render(
      <MemoryRouter>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('my-home-grid')).toHaveClass('my-home-grid');
    expect(screen.getAllByTestId('my-home-tile')).toHaveLength(6);
  });
});
