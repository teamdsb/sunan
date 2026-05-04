import { describe, expect, it, vi } from 'vitest';
import { launchOfficeEntry } from './launchOfficeEntry';

describe('launchOfficeEntry', () => {
  it('navigates for internal routes', () => {
    const navigate = vi.fn();
    launchOfficeEntry(navigate, {
      id: '1',
      title: '站内入口',
      targetType: 'internal_route',
      targetValue: '/office/search?keyword=test',
      openMode: 'current_webview',
    });
    expect(navigate).toHaveBeenCalledWith('/office/search?keyword=test');
  });

  it('opens a new window for external new window mode', () => {
    const navigate = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    launchOfficeEntry(navigate, {
      id: '2',
      title: '外部入口',
      targetType: 'external_url',
      targetValue: 'https://example.com',
      openMode: 'new_window',
    });
    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });
});
