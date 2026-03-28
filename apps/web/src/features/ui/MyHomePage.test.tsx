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

    expect(screen.getByRole('link', { name: '企业资料' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '企业制度' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '电子证照' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '证书提醒' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '船舶监控' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '设置' })).toBeInTheDocument();
  });
});
