/**
 * Identifier normalization utilities
 * Based on DSL Grammar Specification v0.1.0
 */

/**
 * Normalize identifier according to DSL rules:
 * - Spaces → underscores
 * - Hyphens → underscores
 * - Must start with letter
 * - Max length: 63 characters
 *
 * @param identifier - Raw identifier from DSL
 * @returns Normalized identifier
 * @throws Error if identifier is invalid
 */
export function normalizeIdentifier(identifier: string): string {
  if (!identifier) {
    throw new Error('Identifier cannot be empty');
  }

  // Trim leading and trailing whitespace first
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error('Identifier cannot be empty');
  }

  // Convert spaces and hyphens to underscores
  const normalized = trimmed.replace(/[\s-]+/g, '_');

  // Check if starts with letter
  if (!/^[a-zA-Z]/.test(normalized)) {
    throw new Error(`Identifier must start with a letter: '${identifier}'`);
  }

  // Check max length
  if (normalized.length > 63) {
    throw new Error(`Identifier exceeds maximum length of 63 characters: '${identifier}'`);
  }

  // Validate characters (letters, digits, underscores only after normalization)
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(normalized)) {
    throw new Error(`Identifier contains invalid characters: '${identifier}'`);
  }

  return normalized;
}

/**
 * Parse model name with pluralization
 * Supports:
 * - Simple: "User[s]" → { singular: "User", plural: "Users" }
 * - Custom: "Categor[y|ies]" → { singular: "Category", plural: "Categories" }
 * - Irregular: "Person[|People]" → { singular: "Person", plural: "People" }
 *
 * @param modelName - Model name with bracket notation
 * @returns Object with singular and plural forms
 */
export function parseModelName(modelName: string): {
  singular: string;
  plural: string;
  originalForm: string;
} {
  const bracketMatch = modelName.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\[([^\]]*)\]$/);

  if (!bracketMatch) {
    // No brackets - return as-is for both singular and plural
    return {
      singular: modelName,
      plural: modelName,
      originalForm: modelName,
    };
  }

  const stem = bracketMatch[1];
  if (!stem) {
    throw new Error(`Invalid model name format: '${modelName}'`);
  }

  const bracketContent = bracketMatch[2];
  if (bracketContent === undefined) {
    throw new Error(`Invalid pluralization format: '${modelName}'`);
  }

  // Parse bracket content
  if (bracketContent.includes('|')) {
    // Format: Stem[singular_suffix|plural_suffix]
    // Example: Categor[y|ies] → Category/Categories
    // Example: Person[|People] → Person/People (irregular - empty singular, full plural)
    const parts = bracketContent.split('|');
    if (parts.length !== 2) {
      throw new Error(`Invalid pluralization format: '${modelName}'`);
    }

    const singularSuffix = parts[0];
    const pluralSuffix = parts[1];
    if (singularSuffix === undefined || pluralSuffix === undefined) {
      throw new Error(`Invalid pluralization format: '${modelName}'`);
    }

    // Check if this is an irregular plural (empty singular suffix means replace entire word)
    const singular = stem + singularSuffix;
    const plural =
      singularSuffix === '' && pluralSuffix !== '' ? pluralSuffix : stem + pluralSuffix;

    return {
      singular,
      plural,
      originalForm: modelName,
    };
  } else {
    // Format: Stem[suffix]
    // Example: User[s] → User/Users
    return {
      singular: stem,
      plural: stem + bracketContent,
      originalForm: modelName,
    };
  }
}
