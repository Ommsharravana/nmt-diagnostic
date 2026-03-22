// Yi National context — Pathfinder 2026 goals, Health Card system, MYTRI framework
// Source: National-Yi/Pathfinder-2026/ one-pagers and CLAUDE.md

export interface VerticalContext {
  name: string;
  vision2026: string;
  flagshipInitiatives: string[];
  successMetrics: string[];
  nationalChair: string;
  srtnRM: string;
  healthCardTip: string;
  mytriPrimary: string[];
  threeAsEmphasis: { awareness: number; action: number; advocacy: number };
  keyDates: string[];
  crossVerticalOpportunities: string[];
}

export const verticalContexts: Record<string, VerticalContext> = {
  MASOOM: {
    name: "MASOOM",
    vision2026:
      "Every child grows up in a safe environment, protected from all forms of abuse, with empowered adults who can recognize, prevent, and respond.",
    flagshipInitiatives: [
      "Training of Trainers (TOT) — 2,000+ certified trainers nationally",
      "MASOOM Model Schools — comprehensive child safety protocols",
      "Digilante 2.0 — cyber safety for digital-age children",
      "POCSO parent/staff awareness sessions",
    ],
    successMetrics: [
      "1 member sensitization session per new member (mandatory)",
      "Minimum 2 age-appropriate student sessions per month",
      "Minimum 3 Digilante (cyber safety) sessions per quarter",
      "Minimum 3 parent POCSO sessions per quarter",
      "Minimum 1 rural outreach session per quarter",
    ],
    nationalChair: "Sylvia John",
    srtnRM: "Yadhavi Yogesh",
    healthCardTip:
      "Multi-tag opportunity: A school MASOOM session counts as MASOOM + Thalir + potentially Health (mental wellbeing).",
    mytriPrimary: ["Thalir (school students)", "Membership (mandatory sensitization)"],
    threeAsEmphasis: { awareness: 70, action: 25, advocacy: 5 },
    keyDates: [
      "Ongoing: Monthly age-appropriate sessions in schools",
    ],
    crossVerticalOpportunities: [
      "Health: Mental wellbeing component in safety sessions",
      "Road Safety: Child safety holistic approach",
      "Innovation: Digilante 2.0 digital safety tools",
    ],
  },
  "Climate Change": {
    name: "Climate Change",
    vision2026:
      "Leading Local Action for a Sustainable Bharat — awareness, responsibility, and shared ownership for climate action.",
    flagshipInitiatives: [
      "Yi Green Challenge — 10+ lakh saplings planted nationally",
      "Water Warriors — 10,000 cubic meters water bodies restored",
      "E-Waste Collective — 25,000+ kg collected nationally",
      "My City, My Pride — heritage site adoption by every chapter",
      "Green Torch Chapter — sustainable Yi chapters",
    ],
    successMetrics: [
      "30+ climate awareness sessions per chapter",
      "5,000 trees planted per chapter",
      "5 water body clean-up drives per chapter",
      "1,000 kg e-waste collected per chapter",
      "1 heritage site adopted with major events & media",
    ],
    nationalChair: "Krunal Shah (Vadodara)",
    srtnRM: "Christopher (Pudukkottai), Prashanth Ram (Vellore)",
    healthCardTip:
      "Track specific initiative type (Miyawaki/Jal Jeevan/E-Waste/Heritage). Report trees planted, kg collected, cubic meters restored — not just 'event held'.",
    mytriPrimary: ["Membership (tree planting)", "Thalir (awareness)", "Rural (planting, heritage)"],
    threeAsEmphasis: { awareness: 30, action: 60, advocacy: 10 },
    keyDates: [
      "Earth Day: 22 April",
      "World Environment Day: 5 June",
      "Climate Action Week: 5-12 September",
      "COP31: 9-20 November",
    ],
    crossVerticalOpportunities: [
      "Rural Initiatives: Tree planting + village adoption",
      "Sports: Outdoor clean-up drives as sports events",
      "Innovation: Green tech hackathons",
    ],
  },
  Health: {
    name: "Health",
    vision2026:
      "Health of People, Wealth of Bharat — creating healthier, happier lives by building emotionally strong individuals.",
    flagshipInitiatives: [
      "Break the Stigma — mental health awareness in every chapter",
      "HUM5 Initiative — year-round fitness engagement",
      "Kovalam Marathon 2026 — 13 September, Trivandrum",
      "HEALTHYi National Wellness Summit",
      "Four Pillars: Mental Health, Substance Abuse Prevention, Sanitation & Menstrual Health, Active Living",
    ],
    successMetrics: [
      "Break the Stigma: 1 session per year per stakeholder group",
      "Mental Wellness TOT for members quarterly",
      "Life Skills Training in each YUVA college annually",
      "I'm My First Doctor in each Thalir school annually",
      "Drug Abuse Impact sessions in each rural network quarterly",
    ],
    nationalChair: "Prateek Shukla",
    srtnRM: "JayaaVignesh Thangarajan",
    healthCardTip:
      "Specify the Health Pillar (Mental/Substance/Sanitation/Active Living) and type of activity. External partner name is required if applicable.",
    mytriPrimary: ["All 4 MYTRI equally — M (wellness), Y (mental health), T (fitness), Ri (sanitation)"],
    threeAsEmphasis: { awareness: 40, action: 50, advocacy: 10 },
    keyDates: [
      "Drug Abuse Day: 26 June",
      "Health Week: 18-24 August",
      "Kovalam Marathon: 13 September",
      "Mental Health Day: 10 October",
    ],
    crossVerticalOpportunities: [
      "MASOOM: Child mental wellbeing component",
      "Sports: Active Living pillar alignment",
      "Learning: Life skills workshops",
    ],
  },
  "Road Safety": {
    name: "Road Safety",
    vision2026:
      "Be a Road Safety Hero — reduce road accidents and fatalities through awareness, training, and community engagement.",
    flagshipInitiatives: [
      "Chota Cop — road safety report cards for children, 10+ lakh lives reached",
      "Yi Farishtey (Good Samaritan) — awareness 10+ lakh, certified 5+ lakh",
      "Emergency/First Responder Training",
      "Horn Not OK Please campaigns",
    ],
    successMetrics: [
      "Chota Cop digital report card system reaching 10+ lakh lives",
      "Farishtey sessions for all stakeholder groups",
      "EMRI/certification partnerships",
      "Local authority partnerships (helmets, seatbelts, road signs)",
    ],
    nationalChair: "Pavitra H Arora (Dehradun)",
    srtnRM: "Puvelan SV (Salem)",
    healthCardTip:
      "Specify initiative type (Chota Cop/Farishtey/Emergency) and certification level if applicable. Media coverage is high-impact for this vertical.",
    mytriPrimary: ["Thalir (Chota Cop)", "Membership (awareness, corporate)"],
    threeAsEmphasis: { awareness: 60, action: 30, advocacy: 10 },
    keyDates: [
      "Road Safety Week: 26-31 January",
    ],
    crossVerticalOpportunities: [
      "MASOOM: Holistic child safety (road + personal)",
      "Health: First responder training overlaps",
      "Branding: Highly visual campaigns for social media",
    ],
  },
  Accessibility: {
    name: "Accessibility",
    vision2026:
      "Creating Spaces Where Everyone Belongs — real, measurable change, not token actions.",
    flagshipInitiatives: [
      "Project Smile — 15 jobs offered to PwDs nationally",
      "Yi Sarv-Sugamya — 2,500 public places audited, 100 railway stations accessible",
      "Adrishya Kaaravaan — experiential sensitisation",
      "National Accessibility Summit & White Paper",
      "5% PwD membership target in every chapter",
    ],
    successMetrics: [
      "Minimum 5% membership from PwDs, 1 PwD in EC",
      "25% of YUVA colleges 100% accessible",
      "25% of Thalir schools 100% accessible",
      "15 jobs offered & appointments issued to PwDs",
      "2,500 public places audited nationally",
    ],
    nationalChair: "Aseem Abhyankar (Aurangabad)",
    srtnRM: "Srivas A (Chennai)",
    healthCardTip:
      "Track PwD involvement specifically — number of PwDs directly engaged. Specify accessibility type (Physical/Digital/Employment/Educational).",
    mytriPrimary: ["All 4 MYTRI — M (leadership), Y (college audits), T (school audits), Ri (public access)"],
    threeAsEmphasis: { awareness: 40, action: 50, advocacy: 10 },
    keyDates: [
      "World Braille Day: 4 January",
      "Global Accessibility Awareness Day: 21 May",
      "Project Smile Deadline: 30 June",
      "Sarv-Sugamya Deadline: 31 August",
      "Accessibility Week: 5-12 September",
      "National Summit: 23 October",
      "International Day of PwDs: 3 December",
    ],
    crossVerticalOpportunities: [
      "Entrepreneurship: PwD entrepreneurship support",
      "Innovation: Assistive technology hackathons",
      "Sports: Inclusive sports events",
    ],
  },
  Membership: {
    name: "Membership",
    vision2026:
      "Building a Stronger, More Engaged Yi Community — grow thoughtfully, re-engage inactive members, improve gender balance.",
    flagshipInitiatives: [
      "Membership Renewals — strengthen discipline, early renewals",
      "Pune Membership Retreat — July 2026",
      "Varanasi Dev Diwali — 24-26 November 2026",
      "Satellite chapters for dual membership",
    ],
    successMetrics: [
      "9,000+ active members nationally",
      "6 new chapters added",
      "Improved renewal rates",
      "Better gender diversity",
    ],
    nationalChair: "Rahul Singhal (Dehradun)",
    srtnRM: "Shanmuga Nataraj (Sivakasi)",
    healthCardTip:
      "Track new vs renewal vs re-engaged metrics separately. Gender diversity metrics are increasingly important.",
    mytriPrimary: ["Membership (M) exclusively"],
    threeAsEmphasis: { awareness: 20, action: 70, advocacy: 10 },
    keyDates: [
      "Pune Membership Retreat: July 2026",
      "Dev Diwali Varanasi: 24-26 November 2026",
    ],
    crossVerticalOpportunities: [
      "All verticals benefit from stronger membership engagement",
      "Learning: Inner Circles for member retention",
      "Sports: Member bonding through tournaments",
    ],
  },
  YUVA: {
    name: "YUVA",
    vision2026:
      "Building Young Leaders, Shaping India's Future — 1 Million YUVA members by 2026, 10 Million by 2030.",
    flagshipInitiatives: [
      "YUVA Centres of Excellence — 10 physical hubs by 2026",
      "Future 6.0 — Youth Advocacy Summit, September 2026",
      "YUVA Credit System — structured engagement tracking",
      "Record Attempts — World/India Book Records aligned with Yi@25",
      "Partner Institutions — sustained campus engagement",
    ],
    successMetrics: [
      "1 Million YUVA members by 2026",
      "10 YUVA Centres of Excellence established",
      "3-5 colleges as Partner Institutions per chapter",
      "Future 6.0 participation with MPs/MLAs",
      "YUVA Credits system implementation",
    ],
    nationalChair: "Piyush Garg (Siliguri)",
    srtnRM: "TBD",
    healthCardTip:
      "Move from one-time events to sustained campus engagement. Track college names, YUVA Centre status, and credits awarded.",
    mytriPrimary: ["Yuva (Y) primarily, connecting to all verticals"],
    threeAsEmphasis: { awareness: 25, action: 65, advocacy: 10 },
    keyDates: [
      "IDS 6 Launch: 2 February 2026",
      "Future 6.0: September 2026 (YUVA Week)",
    ],
    crossVerticalOpportunities: [
      "Innovation: IDS 6 hackathon in YUVA colleges",
      "Entrepreneurship: Naukri Bazaar + Bharat Billion Impact Challenge",
      "MASOOM: YUVA Nukkad Nataks for child safety awareness",
    ],
  },
  Thalir: {
    name: "Thalir",
    vision2026:
      "Nurturing Today's Children into Tomorrow's Leaders — values-driven, future-ready school children.",
    flagshipInitiatives: [
      "Young Indians Parliament (YiP) — 100% chapter participation",
      "Young Indians Quiz (YiQ) — leadership & critical thinking",
      "Bharat Thalir Week — national celebration",
      "School-level Thalir ECs with student leaders",
      "6 Focus Areas: Wellbeing, Safety, Values, Future Readiness, Social Responsibility, Purpose",
    ],
    successMetrics: [
      "Increase Thalir schools by 50%",
      "100% chapter participation in YiP",
      "YiQ launched locally in every chapter",
      "School-level Thalir ECs formed",
      "Bharat Thalir Week executed",
    ],
    nationalChair: "Pradeep Chanthirakumar (Trichy)",
    srtnRM: "Shenher Lal (Madurai)",
    healthCardTip:
      "Track school names, grade levels, teacher involvement, and student EC formation. YiP participation is a mandatory metric.",
    mytriPrimary: ["Thalir (T) primarily, connecting to MASOOM, Health, Road Safety"],
    threeAsEmphasis: { awareness: 35, action: 55, advocacy: 10 },
    keyDates: [
      "InnovX: February & July 2026",
      "Bharat Thalir Week: TBD",
    ],
    crossVerticalOpportunities: [
      "MASOOM: Child safety in every Thalir school",
      "Innovation: InnovX program for Thalir students",
      "Road Safety: Chota Cop in Thalir schools",
      "Sports: Traditional games festival",
    ],
  },
  "Rural Initiatives": {
    name: "Rural Initiatives",
    vision2026:
      "Partnering with Rural Bharat for Shared Growth — bring villages, artisans, SHGs as partners, not beneficiaries.",
    flagshipInitiatives: [
      "Range De — eco-friendly Holi colours supporting artisans",
      "Rural Bazaar — SHG/rural product showcase during RI Week",
      "Rural Rise 2.0 — experiential conclave at YiFi 2026",
      "Heritage preservation of rural traditions",
      "3-step adoption: Choose community → Find leader → Build relationship",
    ],
    successMetrics: [
      "1-2 villages/SHGs/artisan communities adopted per chapter",
      "Community leaders identified and partnered",
      "Range De executed (eco-Holi colours)",
      "Rural Bazaar during RI Week",
      "All Yi verticals connected to rural networks",
    ],
    nationalChair: "Christine L Sailo (Mizoram)",
    srtnRM: "Mohan Kumar (Tirupur)",
    healthCardTip:
      "Specify Rural Network type (Village/Panchayat/SHG/Artisan/Urban Slum). Stand-alone institutions don't count. Community leader name is important.",
    mytriPrimary: ["Rural (Ri) primarily, engaging all verticals in rural context"],
    threeAsEmphasis: { awareness: 20, action: 65, advocacy: 15 },
    keyDates: [
      "Rural Initiatives Week: 28 July - 3 August 2026",
      "Rural Rise 2.0: At YiFi 2026 (June)",
    ],
    crossVerticalOpportunities: [
      "Climate Change: Tree planting in adopted villages",
      "Health: Rural health camps",
      "Entrepreneurship: Artisan business development",
      "Innovation: Rural Jugaad — frugal innovation",
    ],
  },
  Entrepreneurship: {
    name: "Entrepreneurship",
    vision2026:
      "Building Entrepreneurs. Strengthening Ecosystems. Powering Bharat — bridge information gaps, empower regional entrepreneurs.",
    flagshipInitiatives: [
      "Bharat Entrepreneurship Week (BEW) — 5-11 March 2026",
      "YiFi Summit — June 2026, principal networking platform",
      "Kid-preneur Program — early exposure for Thalir",
      "Naukri Bazaar — employability bridge for YUVA",
      "YiBE — Yi Business Exchange for collaborative problem-solving",
    ],
    successMetrics: [
      "BEW unified national participation + media coverage",
      "YiFi networking outcomes and investor connections",
      "Naukri Bazaar jobs offered vs created",
      "YiBE mentorship outcomes",
      "Kid-preneur workshops in Thalir schools",
    ],
    nationalChair: "Namrata Bhatt (Rajkot)",
    srtnRM: "Neil Kikani (Coimbatore)",
    healthCardTip:
      "Track business outcomes (mentorship pairs, jobs placed, challenges solved) not just event attendance.",
    mytriPrimary: ["Membership (YiBE, networking)", "Yuva (Naukri Bazaar, Impact Challenge)"],
    threeAsEmphasis: { awareness: 25, action: 70, advocacy: 5 },
    keyDates: [
      "Bharat Entrepreneurship Week: 5-11 March 2026",
      "YiFi Summit: June 2026",
      "Bharat Billion Impact Challenge: September 2026",
    ],
    crossVerticalOpportunities: [
      "Innovation: YiFi + IDS convergence",
      "Learning: CEO missions + YiBE synergy",
      "Rural: Rural Rise artisan entrepreneurship",
    ],
  },
  Innovation: {
    name: "Innovation",
    vision2026:
      "Innovation defines what must change — India at inflection point with largest aspirational youth population.",
    flagshipInitiatives: [
      "IDS 6 Program — Ideate→Define→Showcase, YUVA hackathon launched 2 Feb 2026",
      "InnovX — Classes 4-9, innovation mindset in Thalir schools",
      "Innovation Week — 3-7 August 2026",
      "Rural Jugaad — frugal innovation mentoring",
      "AI for Yi — technology adoption",
    ],
    successMetrics: [
      "Government partnerships for IDS",
      "Innovation clubs in each chapter's colleges",
      "City-level IDS conducted with pilot feedback",
      "InnovX in all Thalir schools, 3-5 teams per school",
      "Innovation Week: minimum 3 activities, all stakeholders",
    ],
    nationalChair: "Kumaravel (Erode) — LOCAL",
    srtnRM: "Jothi (Hosur)",
    healthCardTip:
      "Track problem statements addressed, prototype status, and pilot outcomes. Document proof of attempt, not just participation.",
    mytriPrimary: ["Yuva (IDS 6)", "Thalir (InnovX)", "Rural (mentoring)"],
    threeAsEmphasis: { awareness: 20, action: 70, advocacy: 10 },
    keyDates: [
      "IDS 6 Launch: 2 February 2026",
      "InnovX: February & July 2026",
      "Innovation Week: 3-7 August 2026",
    ],
    crossVerticalOpportunities: [
      "Entrepreneurship: Innovation→Startup pipeline",
      "Accessibility: Assistive tech hackathons",
      "Climate: Green tech innovation",
    ],
  },
  Learning: {
    name: "Learning",
    vision2026:
      "Learning sits at the heart of Yi — nation-building needs capable leaders at every life stage. Continuous pipeline, not one-time program.",
    flagshipInitiatives: [
      "CEO Leadership Mission — Q2 2026",
      "International Learning Mission — Q3 2026",
      "Cross Chapter Missions — Feb-Dec with mandatory YiBE + industry visit",
      "Inner Circles — chapter-level peer learning groups",
      "Yi Talks — central repository of speaker sessions",
      "Masters Union engagement",
    ],
    successMetrics: [
      "Participation in international & domestic missions",
      "Masters Union engagement across chapters",
      "Cross-chapter missions with YiBE + industry visit",
      "Financial & digital literacy in rural areas",
      "Yi Talks central repository built",
    ],
    nationalChair: "Jyotsna Singh Agarwal (Lucknow)",
    srtnRM: "Yokesh (Karur)",
    healthCardTip:
      "Specify learning type (CEO Mission/Intl Mission/Cross-Chapter/Inner Circle/Yi Talks). Track outcomes, not just attendance.",
    mytriPrimary: ["Membership (missions, inner circles)", "Yuva (internships)", "Rural (literacy)"],
    threeAsEmphasis: { awareness: 35, action: 60, advocacy: 5 },
    keyDates: [
      "CEO Mission: Q2 2026",
      "International Mission: Q3 2026",
      "Cross Chapter Missions: Feb-Dec 2026",
    ],
    crossVerticalOpportunities: [
      "Entrepreneurship: YiBE integration in missions",
      "Innovation: Design thinking workshops",
      "Health: Life skills training",
    ],
  },
  Branding: {
    name: "Branding (BCDE)",
    vision2026:
      "Building One Strong Voice for Young India — position Yi as India's most credible youth leadership movement.",
    flagshipInitiatives: [
      "BCDE Engine — chapters create actions, branding converts to narratives",
      "30-40% digital growth target with stronger engagement",
      "National recognition of key initiatives (MASOOM, Future, YiFi, YiP, CAW)",
      "Unified look, sound, feel across all chapters",
      "Storytelling: Real stories, short videos, action-inspiring narratives",
    ],
    successMetrics: [
      "30-40% social media growth with engagement",
      "National recognition of 5+ key initiatives",
      "Consistent branding across chapters (templates used)",
      "Impact stories documented and amplified",
      "All events covered on social media same day",
    ],
    nationalChair: "Jayaprashanth Jayachandran (Coimbatore)",
    srtnRM: "Anandakrishnan (Puducherry)",
    healthCardTip:
      "Track reach metrics (impressions, engagement, shares) not just 'posted'. Always associate brand content with a specific vertical/project.",
    mytriPrimary: ["All 4 MYTRI — branding amplifies everyone's stories"],
    threeAsEmphasis: { awareness: 50, action: 35, advocacy: 15 },
    keyDates: [
      "National Branding Week: 24-31 August 2026",
    ],
    crossVerticalOpportunities: [
      "All verticals need branding amplification",
      "Health: Kovalam Marathon media coverage",
      "Climate: Yi Green Challenge visibility",
    ],
  },
  Sports: {
    name: "Sports",
    vision2026:
      "Building Stronger Communities Through the Power of Sport — strategic tool for community bonding and social transformation.",
    flagshipInitiatives: [
      "Chapter & RM-led sports initiatives throughout year",
      "Inter-collegiate tournaments (YUVA, minimum 3 sports)",
      "Inter-school traditional sports festivals (Thalir)",
      "Rural sports facility development",
      "Quarterly member tournaments",
    ],
    successMetrics: [
      "Members: 2 tournaments per year",
      "Yuva: 1 inter-collegiate tournament (minimum 3 sports)",
      "Thalir: 1 traditional sports tournament",
      "Rural: 1 infrastructure project + community tournament",
      "All stakeholders engaged quarterly",
    ],
    nationalChair: "Shrikumarswelu (Coimbatore)",
    srtnRM: "Karthigeyan Sampath (Karur)",
    healthCardTip:
      "Track sports involved, infrastructure created/improved (for rural), and talent identified. Specify tournament type by stakeholder.",
    mytriPrimary: ["All 4 MYTRI — M (tournaments), Y (inter-collegiate), T (traditional), Ri (community)"],
    threeAsEmphasis: { awareness: 15, action: 80, advocacy: 5 },
    keyDates: [
      "Quarterly tournaments throughout year",
      "Kovalam Marathon: 13 September (Health + Sports crossover)",
    ],
    crossVerticalOpportunities: [
      "Health: Active Living pillar alignment",
      "Rural: Sports infrastructure development",
      "Branding: Sports events are highly photogenic",
    ],
  },
  "International Membership": {
    name: "International Membership",
    vision2026:
      "Stay Connected. Lead Globally. Impact Locally — for Young Indians living abroad, connected to India's growth story.",
    flagshipInitiatives: [
      "Roots + Wings model — registered with home chapter + Yi Circles abroad",
      "Digital Mentorship — guide home chapter members",
      "Micro-Impact Projects — local projects in host city",
      "Global Connections — international opportunities for home chapter",
    ],
    successMetrics: [
      "International members registered",
      "Active mentorship partnerships",
      "Global projects/initiatives executed",
      "Connections facilitated to home chapters",
    ],
    nationalChair: "Nishit Sood (Delhi)",
    srtnRM: "Pranav Joshi (Kochi, SRTKKA CLC)",
    healthCardTip:
      "Track country/city, mentorship outcomes, and business/network connections facilitated.",
    mytriPrimary: ["Membership (international segment)"],
    threeAsEmphasis: { awareness: 30, action: 50, advocacy: 20 },
    keyDates: [
      "Take Pride — homecoming events",
    ],
    crossVerticalOpportunities: [
      "Learning: International Learning Missions",
      "Entrepreneurship: Global business connections",
    ],
  },
};

// Best Chapter Formula context
export const bestChapterFormula = {
  formula: "Coverage × Documentation × Impact × Visibility",
  components: [
    {
      name: "Coverage",
      meaning: "All verticals + all MYTRI stakeholders active",
      target: "No zero-activity verticals in any quarter; all 4 stakeholders engaged",
    },
    {
      name: "Documentation",
      meaning: "100% health card submission rate",
      target: "Submit within 48 hours of every activity",
    },
    {
      name: "Impact",
      meaning: "Quality outcomes with numbers + stories",
      target: "Capture metrics + write impact narratives for flagship events",
    },
    {
      name: "Visibility",
      meaning: "Social media + media coverage",
      target: "Post same day; pursue press coverage; use #Yi #Cii #Yi2026 hashtags",
    },
  ],
  monthlyTargets: {
    healthCardEntries: "20+/month",
    verticalsActive: "10/10",
    stakeholdersReached: "4/4",
    membersEngaged: "80%+",
    socialMediaPosts: "15+/month",
    mediaCoverage: "2+/month",
  },
};

// Multi-tag strategy
export const multiTagStrategy =
  "Before every event, ask: 'Which 2-3 verticals can we legitimately tag?' A school health camp = Health + Thalir + MASOOM. A college ENT workshop = Entrepreneurship + Yuva + Learning. A village tree plantation = Climate + Rural + Membership.";
