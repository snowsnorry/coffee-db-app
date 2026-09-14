// Canonical snapshot: coffee_variety_dictionary_v3 from coffee-db/data/coffee-varieties/v3/dictionary.json.
// Only canonical ID → label entries are shipped; extraction and review data stays at source.
import snapshot from "./varieties.json" with { type: "json" };
export const varietyNames: Record<string, string> = snapshot;
