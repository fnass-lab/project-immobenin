/*
# ImmoBénin — Base de données initiale

Crée les tables principales de l'application de location d'appartements au Bénin.

## Nouvelles tables

1. `profiles`
   - `id` (uuid, PK, référence auth.users) — identité de l'utilisateur
   - `nom` (text) — nom de famille
   - `prenom` (text) — prénom
   - `telephone` (text) — numéro WhatsApp au format +229
   - `role` (text) — 'locataire' ou 'proprietaire' (défaut 'locataire')
   - `solde_credits` (integer) — crédits disponibles pour publier/booster (défaut 0)
   - `cgu_accepted` (boolean) — acceptation des CGU (défaut false)
   - `pass_contact_actif` (boolean) — Pass Contacts actif (défaut false)
   - `pass_contact_expires_at` (timestamptz) — expiration du Pass Contacts
   - `created_at` (timestamptz)

2. `listings` (annonces)
   - `id` (uuid, PK)
   - `owner_id` (uuid, FK profiles, défaut auth.uid())
   - `titre` (text)
   - `description` (text)
   - `prix` (integer) — loyer en FCFA/mois
   - `ville` (text)
   - `quartier` (text)
   - `commodites` (text[]) — ex: SBEE, SONEB, pavé, climatisation
   - `photos` (text[]) — URLs Storage
   - `statut` (text) — 'disponible' | 'masque' (défaut 'disponible')
   - `boosted_until` (timestamptz) — date d'expiration du boost
   - `created_at` (timestamptz)

3. `reports` (signalements)
   - `id` (uuid, PK)
   - `listing_id` (uuid, FK listings)
   - `reporter_id` (uuid, FK profiles, défaut auth.uid())
   - `motif` (text)
   - `statut` (text) — 'en_attente' | 'confirme' | 'rejete' (défaut 'en_attente')
   - `created_at` (timestamptz)

4. `contact_unlocks` (déverrouillages de contact)
   - `id` (uuid, PK)
   - `user_id` (uuid, FK profiles, défaut auth.uid())
   - `listing_id` (uuid, FK listings)
   - `expires_at` (timestamptz) — expiration de l'accès au contact
   - `created_at` (timestamptz)

5. `payments` (historique paiements)
   - `id` (uuid, PK)
   - `user_id` (uuid, FK profiles, défaut auth.uid())
   - `type` (text) — 'credits' | 'pass_contact' | 'boost'
   - `montant_fcfa` (integer)
   - `credits_ajoutes` (integer)
   - `description` (text)
   - `statut` (text) — 'reussi' | 'echoue' (défaut 'reussi')
   - `created_at` (timestamptz)

## Triggers

- `handle_new_user` — après insertion dans auth.users, crée une ligne `profiles` par défaut.
  Nécessaire car Supabase ne crée pas automatiquement de profil. Le frontend réessaie
  de lire le profil 3 fois (500ms) si la ligne n'existe pas encore, mais ce trigger
  garantit qu'elle existe dès l'inscription.

## Sécurité (RLS)

- Toutes les tables ont RLS activé.
- `profiles` : un utilisateur authentifié lit/met à jour UNIQUEMENT son propre profil.
- `listings` : tout utilisateur authentifié peut lire les annonces disponibles (SELECT public
  entre utilisateurs), mais seul le propriétaire peut insérer/modifier/supprimer ses annonces.
- `reports` : un utilisateur authentifié peut créer un signalement et lire ses propres signalements.
- `contact_unlocks` : un utilisateur authentifié gère uniquement ses propres déverrouillages.
- `payments` : un utilisateur authentifié voit uniquement son historique de paiements.
*/

-- ============================================================
-- Table: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text,
  prenom text,
  telephone text,
  role text NOT NULL DEFAULT 'locataire' CHECK (role IN ('locataire', 'proprietaire')),
  solde_credits integer NOT NULL DEFAULT 0,
  cgu_accepted boolean NOT NULL DEFAULT false,
  pass_contact_actif boolean NOT NULL DEFAULT false,
  pass_contact_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- Table: listings (annonces)
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text,
  prix integer NOT NULL CHECK (prix >= 0),
  ville text NOT NULL,
  quartier text,
  commodites text[] DEFAULT '{}',
  photos text[] DEFAULT '{}',
  statut text NOT NULL DEFAULT 'disponible' CHECK (statut IN ('disponible', 'masque')),
  boosted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur authentifié peut consulter les annonces disponibles
DROP POLICY IF EXISTS "select_all_listings" ON listings;
CREATE POLICY "select_all_listings" ON listings
  FOR SELECT TO authenticated USING (statut = 'disponible' OR owner_id = auth.uid());

-- Seul le propriétaire peut créer/modifier/supprimer ses annonces
DROP POLICY IF EXISTS "insert_own_listings" ON listings;
CREATE POLICY "insert_own_listings" ON listings
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "update_own_listings" ON listings;
CREATE POLICY "update_own_listings" ON listings
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_listings" ON listings;
CREATE POLICY "delete_own_listings" ON listings
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ============================================================
-- Table: reports (signalements)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  motif text NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirme', 'rejete')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON reports;
CREATE POLICY "select_own_reports" ON reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_reports" ON reports;
CREATE POLICY "insert_own_reports" ON reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- ============================================================
-- Table: contact_unlocks
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_unlocks" ON contact_unlocks;
CREATE POLICY "select_own_unlocks" ON contact_unlocks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_unlocks" ON contact_unlocks;
CREATE POLICY "insert_own_unlocks" ON contact_unlocks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Table: payments (historique paiements)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credits', 'pass_contact', 'boost')),
  montant_fcfa integer NOT NULL CHECK (montant_fcfa >= 0),
  credits_ajoutes integer NOT NULL DEFAULT 0,
  description text,
  statut text NOT NULL DEFAULT 'reussi' CHECK (statut IN ('reussi', 'echoue')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Trigger: création automatique du profil à l'inscription
-- ============================================================
-- Crée une ligne `profiles` par défaut dès qu'un nouvel utilisateur
-- s'inscrit dans auth.users. Le profil est complété (nom, téléphone, etc.)
-- par le frontend via le formulaire d'inscription.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Index pour les requêtes fréquentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_ville ON listings(ville);
CREATE INDEX IF NOT EXISTS idx_listings_statut ON listings(statut);
CREATE INDEX IF NOT EXISTS idx_listings_boosted ON listings(boosted_until);
CREATE INDEX IF NOT EXISTS idx_reports_listing ON reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_unlocks_user ON contact_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
