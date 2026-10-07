// Album des morts, sauvegardé dans le navigateur (localStorage).
// Toutes les lectures/écritures sont protégées : navigation privée, stockage bloqué, etc.

import { DEATHS, type DeathId } from '../data/deaths';

const KEY = 'paulochon.album.v1';
const VALID = new Set<string>(DEATHS.map((d) => d.id));

function load(): Set<DeathId> {
  try {
    const raw = localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list)) return new Set(list.filter((x): x is DeathId => typeof x === 'string' && VALID.has(x)));
  } catch {
    /* stockage indisponible : album en mémoire seulement */
  }
  return new Set();
}

const found = load();

export const album = {
  has: (id: DeathId) => found.has(id),
  get size() {
    return found.size;
  },
  get total() {
    return DEATHS.length;
  },
  /** Ajoute une mort. Renvoie true si elle est nouvelle. */
  add(id: DeathId): boolean {
    if (found.has(id)) return false;
    found.add(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...found]));
    } catch {
      /* ignore */
    }
    return true;
  },
};
