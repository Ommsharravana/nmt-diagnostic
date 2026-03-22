// Yi India organizational data — verticals and regions
// Source: National-Yi/Pathfinder-2026 one-pagers (official Yi data)

export interface Vertical {
  name: string;
  category: "project" | "initiative";
}

export const verticals: Vertical[] = [
  // Nation Building Projects
  { name: "MASOOM", category: "project" },
  { name: "Climate Change", category: "project" },
  { name: "Health", category: "project" },
  { name: "Road Safety", category: "project" },
  { name: "Accessibility", category: "project" },
  // Youth Leadership Initiatives
  { name: "Entrepreneurship", category: "initiative" },
  { name: "Innovation", category: "initiative" },
  { name: "Learning", category: "initiative" },
  { name: "Branding", category: "initiative" },
  { name: "Sports", category: "initiative" },
];

export interface Region {
  code: string;
  name: string;
}

// Official Yi regions from Pathfinder 2026 one-pagers
export const regions: Region[] = [
  { code: "NR", name: "Northern Region" },
  { code: "WR", name: "Western Region" },
  { code: "ER", name: "Eastern Region" },
  { code: "NER", name: "North Eastern Region" },
  { code: "SRTN", name: "Southern Region Tamil Nadu" },
  { code: "SRTKKA", name: "Southern Region TK KA" },
];
