export type UserRole = 'locataire' | 'proprietaire';

export interface Profile {
  id: string;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  role: UserRole;
  solde_credits: number;
  cgu_accepted: boolean;
  pass_contact_actif: boolean;
  pass_contact_expires_at: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  owner_id: string;
  titre: string;
  description: string | null;
  prix: number;
  ville: string;
  quartier: string | null;
  commodites: string[];
  photos: string[];
  statut: 'disponible' | 'masque';
  boosted_until: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  listing_id: string;
  reporter_id: string;
  motif: string;
  statut: 'en_attente' | 'confirme' | 'rejete';
  created_at: string;
}

export interface ContactUnlock {
  id: string;
  user_id: string;
  listing_id: string;
  expires_at: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  type: 'credits' | 'pass_contact' | 'boost';
  montant_fcfa: number;
  credits_ajoutes: number;
  description: string | null;
  statut: 'reussi' | 'echoue';
  created_at: string;
}

export const VILLES = [
  'Cotonou',
  'Abomey-Calavi',
  'Porto-Novo',
  'Parakou',
  'Ouidah',
  'Sèmè-Kpodji',
] as const;

export const COMMODITES = [
  'Compteur prépayé SBEE',
  'Eau SONEB',
  'Pavé',
  'Climatisation',
  'Wi-Fi',
  'Parking',
  'Garage',
  'Jardin',
  'Cuisine équipée',
  'Eau chaude',
] as const;
