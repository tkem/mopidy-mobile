import { ca } from './ca';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { Locale } from './locale';
import { nb } from './nb';
import { nl } from './nl';
import { pl } from './pl';
import { sk } from './sk';

export type { Locale } from './locale';

export const LOCALES: Record<string, Locale> = { ca, de, en, es, fr, nb, nl, pl, sk };
