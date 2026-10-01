export function initialsOf(...parts: (string | null | undefined)[]): string {
  const letters = parts
    .map((part) => part?.trim()[0])
    .filter((letter): letter is string => Boolean(letter))
    .slice(0, 2)
    .join('');
  return (letters || '?').toUpperCase();
}

export function Avatar({ initials, large = false }: { initials: string; large?: boolean }) {
  return (
    <span className={'avatar' + (large ? ' avatar-lg' : '')} aria-hidden="true">
      {initials}
    </span>
  );
}
