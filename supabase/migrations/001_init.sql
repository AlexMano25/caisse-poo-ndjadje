-- ============================================================
-- CAISSE POO NDJADJE — Migration initiale Supabase
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE : utilisateurs
-- ============================================================
create table if not exists public.utilisateurs (
  id            uuid primary key default uuid_generate_v4(),
  membre_id     text unique,
  login         text unique not null,
  prenom        text not null,
  nom           text not null,
  email         text unique,
  telephone     text,
  role          text not null default 'membre'
                check (role in ('superadmin','president','tresorier','secretaire','membre')),
  actif         boolean not null default true,
  credit_score  int not null default 50,
  must_change_password boolean not null default true,
  avatar        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE : membres (données financières)
-- ============================================================
create table if not exists public.membres (
  id               text primary key,
  nom              text not null,
  adhesion         int not null default 50000,
  epargne_2024     int not null default 0,
  interets_2024    int not null default 0,
  retenue_2024     int not null default 0,
  solde_2024       int not null default 0,
  epargne_2025     int not null default 0,
  interets_2025    int not null default 0,
  retenue_2025     int not null default 0,
  solde_2025       int not null default 0,
  sanctions_total  int not null default 0,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- TABLE : versements (epargne, cotisation, contribution)
-- ============================================================
create table if not exists public.versements (
  id           uuid primary key default uuid_generate_v4(),
  membre_id    text not null references public.membres(id),
  montant      int not null,
  type         text not null default 'epargne'
               check (type in ('epargne','cotisation','contribution_projet','remboursement','autre')),
  rubrique     text,
  seance       text,
  annee        int not null default extract(year from now())::int,
  notes        text,
  saisi_par    uuid references public.utilisateurs(id),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- TABLE : prets
-- ============================================================
create table if not exists public.prets (
  id             uuid primary key default uuid_generate_v4(),
  membre_id      text not null references public.membres(id),
  montant        int not null,
  interet        int not null,
  a_rembourser   int not null,
  nb_trimestres  int not null default 1,
  taux           numeric not null default 7.5,
  statut         text not null default 'en_cours'
                 check (statut in ('en_cours','rembourse','en_retard')),
  date_accorde   date not null default current_date,
  date_rembourse date,
  accorde_par    uuid references public.utilisateurs(id),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- TABLE : rapports_seance (PV)
-- ============================================================
create table if not exists public.rapports_seance (
  id              uuid primary key default uuid_generate_v4(),
  session_number  int not null,
  date_seance     date not null,
  titre           text not null,
  contenu         text not null,
  ordre_du_jour   text,
  decisions       text,
  auteur          uuid references public.utilisateurs(id),
  is_published    boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- TABLE : charte (configuration tontine)
-- ============================================================
create table if not exists public.charte (
  id                  uuid primary key default uuid_generate_v4(),
  nom_caisse          text not null default 'Caisse POO NDJADJE',
  taux_epargne_annuel numeric not null default 27.4,
  taux_pret_trim      numeric not null default 7.5,
  taux_retenue        numeric not null default 1.5,
  montant_adhesion    int not null default 50000,
  periodicite         text not null default 'Trimestrielle',
  prochaine_seance    date,
  date_creation       date not null default current_date,
  is_published        boolean not null default false,
  cree_par            uuid references public.utilisateurs(id),
  created_at          timestamptz not null default now()
);

-- ============================================================
-- TABLE : calendrier_pot (qui reçoit quand)
-- ============================================================
create table if not exists public.calendrier_pot (
  id           uuid primary key default uuid_generate_v4(),
  membre_id    text not null references public.membres(id),
  seance       text not null,
  date_prev    date,
  montant_pot  int,
  statut       text not null default 'prevu'
               check (statut in ('prevu','verse','reporte')),
  annee        int not null default extract(year from now())::int,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- TABLE : annonces_pret (demandes membres)
-- ============================================================
create table if not exists public.annonces_pret (
  id               uuid primary key default uuid_generate_v4(),
  membre_id        text not null references public.membres(id),
  montant_souhaite int not null,
  seance_cible     date,
  statut           text not null default 'en_attente'
                   check (statut in ('en_attente','approuve','refuse')),
  notes            text,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- TABLE : sanctions
-- ============================================================
create table if not exists public.sanctions (
  id         uuid primary key default uuid_generate_v4(),
  membre_id  text not null references public.membres(id),
  montant    int not null,
  motif      text not null,
  applique_par uuid references public.utilisateurs(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.utilisateurs      enable row level security;
alter table public.membres           enable row level security;
alter table public.versements        enable row level security;
alter table public.prets             enable row level security;
alter table public.rapports_seance   enable row level security;
alter table public.charte            enable row level security;
alter table public.calendrier_pot    enable row level security;
alter table public.annonces_pret     enable row level security;
alter table public.sanctions         enable row level security;

-- Lecture : tous les membres actifs authentifiés
create policy "lecture_membres" on public.membres
  for select using (auth.role() = 'authenticated');

create policy "lecture_versements" on public.versements
  for select using (auth.role() = 'authenticated');

create policy "lecture_prets" on public.prets
  for select using (auth.role() = 'authenticated');

create policy "lecture_rapports" on public.rapports_seance
  for select using (auth.role() = 'authenticated' and is_published = true);

create policy "lecture_charte" on public.charte
  for select using (auth.role() = 'authenticated');

create policy "lecture_calendrier" on public.calendrier_pot
  for select using (auth.role() = 'authenticated');

create policy "lecture_annonces" on public.annonces_pret
  for select using (auth.role() = 'authenticated');

-- Écriture : uniquement via service_role (fonctions backend)
-- Les écritures passent par les API Routes Supabase

-- ============================================================
-- DONNÉES INITIALES : Charte
-- ============================================================
insert into public.charte (
  nom_caisse, taux_epargne_annuel, taux_pret_trim,
  taux_retenue, montant_adhesion, periodicite,
  prochaine_seance, date_creation, is_published
) values (
  'Caisse POO NDJADJE', 27.4, 7.5,
  1.5, 50000, 'Trimestrielle',
  '2026-05-30', '2023-11-04', true
) on conflict do nothing;

-- ============================================================
-- INDEX pour performances
-- ============================================================
create index if not exists idx_versements_membre on public.versements(membre_id);
create index if not exists idx_prets_membre      on public.prets(membre_id);
create index if not exists idx_prets_statut      on public.prets(statut);
create index if not exists idx_sanctions_membre  on public.sanctions(membre_id);
