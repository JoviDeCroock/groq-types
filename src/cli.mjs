/**
 * This file will take a directory & extension to scan files out of, the current main issue about this being the following:
 * - index.js -- implements a groq query that fetches categories
 * - groq_fragments.js -- exports the fields for category which is used in index.js
 *
 * How do we comebine these to correctly extract types for the query in index.js
 */
