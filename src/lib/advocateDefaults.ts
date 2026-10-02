import { useEffect, useMemo } from 'react';
import { useAuth } from './auth';

export interface AdvocateDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

const EMPTY: AdvocateDetails = { name: '', address: '', phone: '', email: '' };

const storageKey = (userId: string) => `lawfilings:advocate-details:${userId}`;

function readStored(userId: string): Partial<AdvocateDetails> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as Partial<AdvocateDetails>) : {};
  } catch {
    return {};
  }
}

/** Starting values for a wizard's advocate fields: name and email come from the advocate's
 *  account, address and phone from whatever they last typed into any wizard on this device. */
export function useAdvocateDefaults(): AdvocateDetails {
  const { user } = useAuth();
  return useMemo(() => {
    if (!user || user.role !== 'advocate') return EMPTY;
    const stored = readStored(user.id);
    return {
      name: stored.name || user.fullName,
      address: stored.address ?? '',
      phone: stored.phone ?? '',
      email: stored.email || user.email,
    };
  }, [user]);
}

/** Remembers non-empty advocate details so the next wizard opens already filled in. */
export function useRememberAdvocateDetails(details: AdvocateDetails): void {
  const { user } = useAuth();
  const { name, address, phone, email } = details;
  useEffect(() => {
    if (!user || user.role !== 'advocate') return;
    const update: Partial<AdvocateDetails> = {};
    if (name.trim()) update.name = name;
    if (address.trim()) update.address = address;
    if (phone.trim()) update.phone = phone;
    if (email.trim()) update.email = email;
    if (Object.keys(update).length === 0) return;
    try {
      localStorage.setItem(storageKey(user.id), JSON.stringify({ ...readStored(user.id), ...update }));
    } catch {
      // storage unavailable — prefill just won't carry over
    }
  }, [user, name, address, phone, email]);
}
