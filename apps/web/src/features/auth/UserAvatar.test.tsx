import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('renders the enterprise wecom avatar when available', () => {
    render(
      <UserAvatar
        name="王工"
        avatar="https://avatar.example.com/wang.png"
      />,
    );

    expect(screen.getByRole('img', { name: '王工的头像' })).toHaveAttribute(
      'src',
      'https://avatar.example.com/wang.png',
    );
  });

  it('falls back to the first name character when the image fails', () => {
    render(
      <UserAvatar
        name="王工"
        avatar="https://avatar.example.com/missing.png"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: '王工的头像' }));

    expect(screen.queryByRole('img', { name: '王工的头像' })).toBeNull();
    expect(screen.getByText('王')).toBeInTheDocument();
  });

  it('uses the first name character when no avatar was returned', () => {
    render(<UserAvatar name="李富悦" avatar={null} />);

    expect(screen.getByText('李')).toBeInTheDocument();
  });
});
