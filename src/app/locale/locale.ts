/** A user interface language. */
export interface Locale {
  language: string;
  displayName: string;
  messages: Record<string, string>;
}
