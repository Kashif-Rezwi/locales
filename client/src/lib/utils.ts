/**
 * Shared utility functions used across the client.
 *
 * cn() — merges CSS class names, filtering falsy values.
 * A lightweight alternative to clsx for Tailwind class composition.
 * Full clsx + tailwind-merge will be added in Chunk 13 when UI components are built.
 */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(' ');
}
