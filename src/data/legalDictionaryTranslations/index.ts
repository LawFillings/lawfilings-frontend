import type { Language } from '../../lib/language';
import { definitions as hi } from './hi';
import { definitions as pa } from './pa';
import { definitions as gu } from './gu';
import { definitions as asLang } from './as';
import { definitions as bn } from './bn';
import { definitions as mr } from './mr';
import { definitions as ta } from './ta';
import { definitions as te } from './te';
import { definitions as kn } from './kn';
import { definitions as ml } from './ml';
import { definitions as orLang } from './or';
import { definitions as ur } from './ur';

/** Per-language overrides for Legal Dictionary definitions, keyed by term id. A language missing
 *  from this map (or a term id missing within it) falls back to the term's English `definition`. */
export const legalDictionaryDefinitionTranslations: Partial<Record<Language, Record<string, string>>> = {
  hi,
  pa,
  gu,
  as: asLang,
  bn,
  mr,
  ta,
  te,
  kn,
  ml,
  or: orLang,
  ur,
};
