// Yi India organizational data — verticals and regions

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
  chapters: string[];
}

export const regions: Region[] = [
  {
    code: "NR",
    name: "Northern Region",
    chapters: [
      "Amritsar", "Chandigarh", "Delhi", "Dehradun", "Faridabad",
      "Gurgaon", "Jaipur", "Jalandhar", "Jammu", "Jodhpur",
      "Karnal", "Lucknow", "Ludhiana", "Noida", "Panchkula",
      "Udaipur", "Varanasi",
    ],
  },
  {
    code: "WR",
    name: "Western Region",
    chapters: [
      "Ahmedabad", "Baroda", "Goa", "Indore", "Mumbai",
      "Nagpur", "Nashik", "Pune", "Rajkot", "Surat", "Thane",
    ],
  },
  {
    code: "ER",
    name: "Eastern Region",
    chapters: [
      "Bhubaneswar", "Guwahati", "Jamshedpur", "Kolkata",
      "Patna", "Ranchi", "Rourkela", "Siliguri",
    ],
  },
  {
    code: "SR",
    name: "Southern Region",
    chapters: [
      "Bengaluru", "Hubli", "Hyderabad", "Kochi",
      "Mangaluru", "Mysuru", "Trivandrum", "Visakhapatnam",
    ],
  },
  {
    code: "SRTN",
    name: "Southern Region Tamil Nadu",
    chapters: [
      "Chennai", "Coimbatore", "Erode", "Hosur", "Madurai",
      "Salem", "Tirupur", "Trichy", "Vellore",
    ],
  },
  {
    code: "CR",
    name: "Central Region",
    chapters: [
      "Bhopal", "Chhattisgarh", "Jabalpur",
    ],
  },
];

// Flat list of all chapters for quick lookup
export function getAllChapters(): string[] {
  return regions.flatMap((r) => r.chapters).sort();
}

// Get region by chapter name
export function getRegionForChapter(chapter: string): Region | undefined {
  return regions.find((r) => r.chapters.includes(chapter));
}
