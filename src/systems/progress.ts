// Progression : niveaux terminés, sauvegardés dans le navigateur (localStorage, toujours dans un try/catch).
// Un niveau est débloqué quand le précédent est terminé (le niveau 1 l'est d'office).

const KEY = 'paulochon.progress.v1';

function load(): Set<number> {
  try {
    const raw = localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list)) return new Set(list.filter((x): x is number => Number.isInteger(x)));
  } catch {
    /* stockage indisponible : progression en mémoire seulement */
  }
  return new Set();
}

const done = load();

export const progress = {
  isDone: (level: number) => done.has(level),
  isUnlocked: (level: number) => level <= 1 || done.has(level - 1),
  complete(level: number): void {
    if (done.has(level)) return;
    done.add(level);
    try {
      localStorage.setItem(KEY, JSON.stringify([...done]));
    } catch {
      /* ignore */
    }
  },
};
