import { describe, expect, it } from 'vitest';

import css from './app.css?raw';

describe('dashboard layout CSS', () => {
  it('aligns enterprise page heroes and card grids to the same content frame', () => {
    const sharedPageFrameRule =
      css.match(
        /\.shell-layout-enterprise:not\(\.shell-layout-my-home\)\s+\.shell-content\s*>\s*\.page-hero,\s*\.shell-layout-enterprise:not\(\.shell-layout-my-home\)\s+\.shell-content\s*>\s*\.page-card-grid\s*\{[^}]*\}/s,
      )?.[0] ?? '';

    expect(sharedPageFrameRule).toContain('width: min(100%, 1500px);');
    expect(sharedPageFrameRule).toContain('margin-inline: auto;');
    expect(sharedPageFrameRule).toContain('padding-inline: 24px;');
  });

  it('keeps the page content out of nested vertical scroll containers', () => {
    const shellContentRule =
      css.match(
        /\.shell-layout-enterprise:not\(\.shell-layout-my-home\)\s+\.shell-content\s*\{[^}]*\}/s,
      )?.[0] ?? '';

    expect(shellContentRule).toContain('overflow-x: clip;');
    expect(shellContentRule).toContain('overflow-y: visible;');
    expect(shellContentRule).not.toContain('overflow-x: hidden;');
  });

  it('keeps independent dashboard columns content-height instead of stretching them', () => {
    expect(css).toMatch(
      /\.my-home-dashboard,\s*\.office-dashboard,\s*\.procurement-dashboard,\s*\.workbench-board-layout\s*\{[^}]*align-items:\s*start;/s,
    );
  });

  it('balances the procurement process cards beside a visible budget card', () => {
    expect(css).toMatch(
      /\.procurement-dashboard:not\(\.procurement-dashboard-without-budget\)\s+\.procurement-process-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s,
    );
  });

  it('uses three readable shortcut columns on desktop without overriding mobile layouts', () => {
    expect(css).toMatch(
      /@media\s*\(min-width:\s*769px\)\s*\{[^}]*\.shell-layout-enterprise\s+\.my-home-page\s+\.my-home-card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s,
    );
  });

  it('centers shortcut card content for whole-card navigation', () => {
    expect(css).toMatch(
      /\.my-home-page\s+\.my-home-shortcut\s*\{[^}]*justify-items:\s*center;[^}]*text-align:\s*center;/s,
    );
    expect(css).toMatch(
      /\.my-home-page\s+\.my-home-shortcut-copy\s*\{[^}]*text-align:\s*center;/s,
    );
  });

  it('keeps my-home shortcuts compact enough for H5 scanning', () => {
    expect(css).toMatch(
      /\.my-home-page\s+\.my-home-shortcut\s*\{[^}]*min-height:\s*146px;[^}]*padding:\s*14px;/s,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.my-home-page\s+\.my-home-shortcut\s*\{[^}]*min-height:\s*108px;[^}]*padding:\s*12px;/s,
    );
  });

  it('lets office categories wrap without horizontal overflow', () => {
    expect(css).toMatch(
      /\.office-filter-panel\s+\.ant-segmented-group\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*gap:\s*6px;/s,
    );
    expect(css).toMatch(
      /\.office-filter-panel\s+\.ant-segmented-item\s*\{[^}]*flex:\s*1\s+1\s+90px;[^}]*min-width:\s*0;/s,
    );
    expect(css).not.toContain('flex: 1 1 86px !important;');
  });

  it('keeps the office search control lightweight instead of card-like', () => {
    expect(css).toMatch(
      /\.office-search-panel\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto;[^}]*gap:\s*8px;/s,
    );
    expect(css).toMatch(
      /\.office-search-panel\s+\.ant-input-affix-wrapper\s*\{[^}]*min-height:\s*44px;[^}]*box-shadow:\s*none;/s,
    );
  });

  it('stacks dashboard rails below their main panel on medium desktops', () => {
    const start = css.indexOf(
      '@media (min-width: 1281px) and (max-width: 1440px)',
    );
    const end = css.indexOf('@media (max-width: 1280px)', start);
    const mediumDesktopRules = css.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(mediumDesktopRules).toContain(
      'grid-template-columns: 280px minmax(0, 1fr);',
    );
    expect(mediumDesktopRules).toContain("'side main'");
    expect(mediumDesktopRules).toContain("'right right'");
    expect(mediumDesktopRules).toContain(
      '.workbench-board-layout {\n    grid-template-columns: minmax(0, 1fr);',
    );
  });

  it('lets an empty workbench board use the full module grid width', () => {
    expect(css).toMatch(
      /\.workbench-module-grid\s*>\s*\.placeholder-card\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s,
    );
  });

  it('lays attendance statistics out as responsive metric cards', () => {
    expect(css).toMatch(
      /\.workbench-attendance-stat-grid\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/s,
    );
    expect(css).toMatch(
      /\.workbench-attendance-stat-card\s*\{[^}]*min-width:\s*0;[^}]*padding:/s,
    );
  });

  it('keeps responsive table actions readable and separated', () => {
    expect(css).toMatch(
      /\.responsive-table-mobile\s+\.responsive-table-actions-cell\s+\.ant-space\s*\{[^}]*column-gap:\s*10px\s*!important;[^}]*row-gap:\s*10px\s*!important;/s,
    );
    expect(css).toMatch(
      /\.responsive-table-mobile\s+\.responsive-table-actions-cell\s+\.ant-btn\s*\{[^}]*min-width:\s*78px;[^}]*min-height:\s*40px;/s,
    );
  });

  it('keeps disabled buttons visibly disabled without hiding their labels', () => {
    expect(css).toMatch(
      /\.shell-layout-enterprise\s+\.ant-btn:disabled:not\(\.ant-btn-text\)[^{]*\{[^}]*opacity:\s*1;[^}]*color:\s*#61738d\s*!important;/s,
    );
  });

  it('lets titled cards size their body below the header without clipping', () => {
    const cardBodyRule =
      css.match(
        /\.placeholder-card\s+\.ant-card-body,\s*\.reminder-stat-card\s+\.ant-card-body\s*\{[^}]*\}/s,
      )?.[0] ?? '';

    expect(cardBodyRule).toContain('flex: 1 1 auto;');
    expect(cardBodyRule).toContain('min-height: 0;');
    expect(cardBodyRule).not.toContain('height: 100%;');
  });

  it('keeps primary ghost buttons transparent with a readable label', () => {
    expect(css).toMatch(
      /\.shell-layout-enterprise:not\(\.shell-layout-my-home\)\s+\.ant-btn-primary:not\(\.ant-btn-background-ghost\)\s*\{/s,
    );
    expect(css).toMatch(
      /\.shell-layout-enterprise:not\(\.shell-layout-my-home\)\s+\.ant-btn-primary\.ant-btn-background-ghost\s*\{[^}]*color:\s*var\(--my-blue\)\s*!important;[^}]*background:\s*transparent\s*!important;[^}]*box-shadow:\s*none;/s,
    );
  });
});
