// Prompt slates for The ReadMoreSFF 1500.
// 10 genres × 10 themes × 10 objects = 1,000 unique prompt combinations.
// Each ~40-writer group draws ONE assignment from this slate per round.

export const GENRES = [
  { slug: "hard-sci-fi",       name: "Hard Sci-Fi",       hint: "Rigorous science as the engine of the plot." },
  { slug: "soft-sci-fi",       name: "Soft Sci-Fi",       hint: "Society-driven SF — politics, religion, gender, AI ethics." },
  { slug: "space-opera",       name: "Space Opera",       hint: "Galactic scale, ships, dynasties, sweeping stakes." },
  { slug: "cyberpunk",         name: "Cyberpunk",         hint: "High-tech, low-life. Hackers, megacorps, urban decay." },
  { slug: "steampunk",         name: "Steampunk",         hint: "Anachronistic tech in Victorian / industrial-era settings." },
  { slug: "high-fantasy",      name: "High Fantasy",      hint: "Secondary worlds, mythic stakes, heroic arcs." },
  { slug: "low-fantasy",       name: "Low Fantasy",       hint: "Real world with limited or hidden magic." },
  { slug: "urban-fantasy",     name: "Urban Fantasy",     hint: "Magic embedded in the contemporary world." },
  { slug: "magical-realism",   name: "Magical Realism",   hint: "Quotidian life with unexplained, unquestioned magic." },
  { slug: "weird-fiction",     name: "Weird Fiction",     hint: "Cosmic horror, slipstream, the uncategorizably strange." },
] as const;

export const THEMES = [
  { slug: "time-travel",          name: "Time Travel",          hint: "Causality bent, paradoxes, divergent timelines." },
  { slug: "leviathan",             name: "Leviathan",             hint: "Something immense — beast, machine, system — looms over the story." },
  { slug: "space-exploration",     name: "Space Exploration",     hint: "First crossings — into vacuum, into void, into the dark." },
  { slug: "first-contact",         name: "First Contact",         hint: "An encounter with the truly alien — or an aliens' first sight of us." },
  { slug: "the-last-of-their-kind", name: "The Last of Their Kind", hint: "Final survivor of a species, lineage, art, or ideology." },
  { slug: "forbidden-bargain",     name: "A Forbidden Bargain",   hint: "A trade is made that should not have been made." },
  { slug: "broken-memory",         name: "Broken Memory",         hint: "What's missing, what's reconstructed, what's lied about." },
  { slug: "falling-empire",        name: "A Falling Empire",      hint: "End of a great order — politely, violently, or unwitnessed." },
  { slug: "apotheosis",            name: "Apotheosis",            hint: "A character ascends — to godhood, intelligence, sainthood, monstrosity." },
  { slug: "the-vow-broken",        name: "The Vow Broken",        hint: "An oath, contract, geas, or promise fails." },
] as const;

export const OBJECTS = [
  { slug: "pocket-watch",      name: "A pocket watch",      hint: "Mechanical, antique, possibly stopped." },
  { slug: "skeleton-key",      name: "A skeleton key",      hint: "Opens what shouldn't be opened." },
  { slug: "scarred-map",       name: "A scarred map",       hint: "Burned, torn, redrawn, or annotated by many hands." },
  { slug: "obsidian-blade",    name: "An obsidian blade",   hint: "Volcanic glass, ritual, ancient." },
  { slug: "radio-transmitter", name: "A radio transmitter", hint: "Crystal set, ham rig, distress beacon — analog signal." },
  { slug: "glass-eye",         name: "A glass eye",         hint: "Prosthetic, watching, more than glass." },
  { slug: "handwritten-letter",name: "A handwritten letter",hint: "Sealed, unsent, opened too late, written in a dead language." },
  { slug: "tarnished-lighter", name: "A tarnished lighter", hint: "Zippo, ritual flame, the last spark." },
  { slug: "wooden-flute",      name: "A wooden flute",      hint: "Hand-carved instrument — folk magic adjacent." },
  { slug: "empty-bottle",      name: "An empty bottle",     hint: "Was full of something. Isn't anymore." },
] as const;

export type Genre = (typeof GENRES)[number];
export type Theme = (typeof THEMES)[number];
export type Object_ = (typeof OBJECTS)[number];

export type Prompt = {
  genre: Genre["slug"];
  theme: Theme["slug"];
  object: Object_["slug"];
};

export function lookupGenre(slug: string): Genre | undefined {
  return GENRES.find((g) => g.slug === slug);
}
export function lookupTheme(slug: string): Theme | undefined {
  return THEMES.find((t) => t.slug === slug);
}
export function lookupObject(slug: string): Object_ | undefined {
  return OBJECTS.find((o) => o.slug === slug);
}

// Total combinations: 10 × 10 × 10 = 1,000 unique prompts.
// At 40 writers/group, the inaugural cycle will use ~6-25 prompts depending on registration volume.
