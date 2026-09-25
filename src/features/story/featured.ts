/** Stories offered in the Story panel and the Import panel. Paths are site-relative. */
export interface FeaturedStory {
  url: string;
  title: string;
  blurb: string;
}

export const FEATURED_STORIES: FeaturedStory[] = [
  {
    url: '/stories/bhotekoshi-2026/story.json',
    title: 'The Bhote Koshi–Trishuli disaster, 26 August 2026',
    blurb:
      'An ice–rock avalanche on Langtang Lirung became a 200 km debris flow. Follow the front minute by minute, then see each town before and after at sub-metre resolution.',
  },
];
