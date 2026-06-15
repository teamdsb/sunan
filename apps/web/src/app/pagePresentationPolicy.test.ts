import { describe, expect, it } from 'vitest';

const pageSources = import.meta.glob('../features/**/*Page.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

function getTitledPageHeroes(source: string) {
  return Array.from(
    source.matchAll(
      /<section className="page-hero[^"]*">([\s\S]*?)<\/section>/g,
    ),
  )
    .map((match) => match[1])
    .filter((hero) => hero.includes('<Typography.Title'));
}

describe('page presentation policy', () => {
  it('uses the page title instead of a redundant section kicker', () => {
    const violations = Object.entries(pageSources)
      .filter(([, source]) => source.includes('sunan-section-kicker'))
      .map(([path]) => path);

    expect(violations).toEqual([]);
  });

  it('places a short explanation below every page title before page content', () => {
    const violations = Object.entries(pageSources).flatMap(([path, source]) =>
      getTitledPageHeroes(source).flatMap((hero, index) => {
        const descriptionIndex = hero.indexOf('<Typography.Paragraph');
        const firstCardIndex = hero.indexOf('<Card');
        const hasLeadingDescription =
          descriptionIndex >= 0 &&
          (firstCardIndex < 0 || descriptionIndex < firstCardIndex);

        return hasLeadingDescription ? [] : [`${path}#hero-${index + 1}`];
      }),
    );

    expect(violations).toEqual([]);
  });
});
