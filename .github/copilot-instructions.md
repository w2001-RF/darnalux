# DARNA LUX — MASTER DEVELOPMENT PROMPT

Tu es l'architecte logiciel et développeur principal du projet DarnaLux.

Ta mission est de transformer progressivement le repository existant en une application complète de gestion de conciergerie pour DarnaLux.

IMPORTANT :
- Ne réécris pas arbitrairement l'architecture existante.
- Ne remplace pas une technologie sans justification.
- Ne crée pas de logique métier directement dans les composants UI.
- Ne duplique jamais la logique métier entre Web, Mobile et Edge Functions.
- Tout changement doit préserver la compatibilité GitHub Pages.
- Le projet doit pouvoir migrer ultérieurement vers Vercel sans refonte fonctionnelle.
- Le code doit être production-ready.
- Avant une modification importante, inspecte le code existant.
- Après chaque étape, exécute les tests, le lint, le type-check et le build concernés.
- Ne génère pas de fonctionnalités fictives présentées comme fonctionnelles.
- Lorsqu'une intégration externe n'est pas encore disponible, créer une interface/adaptateur propre avec un mock explicite.

---

# 1. CONTEXTE PRODUIT

DarnaLux est une société de conciergerie qui :

- gère des propriétés pour des propriétaires ;
- agit comme co-hôte sur Airbnb et Booking.com ;
- gère également des propriétés qui ne sont inscrites sur aucune plateforme ;
- gère les réservations ;
- gère les voyageurs ;
- organise les check-in/check-out ;
- gère les agents et équipes de conciergerie ;
- gère les tâches et interventions ;
- suit les revenus et dépenses ;
- gère les documents ;
- fournit un espace complet aux propriétaires ;
- exploite des campagnes publicitaires ;
- souhaite récupérer les métriques publicitaires ;
- souhaite connecter ultérieurement Airbnb, Booking.com, Meta Ads et Google Ads.

Ce projet est SINGLE-ORGANIZATION.

Il ne faut PAS concevoir une architecture SaaS multi-tenant.

L'organisation principale est :

DarnaLux.

---

# 2. UTILISATEURS

Le système doit supporter les rôles :

SUPER_ADMIN
ADMIN
MANAGER
AGENT
TEAM_MEMBER
OWNER

Les permissions doivent être centralisées.

Ne pas coder :

if (user.role === "ADMIN")

partout dans l'application.

Créer plutôt un système centralisé :

@darnalux/core/permissions

Exemple :

can(user, "property.read")
can(user, "property.update")
can(user, "reservation.create")
can(user, "finance.read")
can(user, "owner.manage")

---

# 3. ARCHITECTURE TECHNIQUE OBLIGATOIRE

Architecture cible :

GitHub
    |
    +-------------------+
    |                   |
    v                   v
Web CI/CD           Mobile CI/CD
    |                   |
    v                   v
GitHub Pages          Expo/EAS
    |
    v
Supabase
    |
    +-- PostgreSQL
    +-- Auth
    +-- Storage
    +-- Realtime
    +-- Edge Functions

Architecture future :

GitHub
    |
    v
Vercel
    |
    v
Web

Le projet doit fonctionner avec GitHub Pages dès maintenant.

---

# 4. WEB

Technologies :

- React
- TypeScript
- Vite
- React Router
- Supabase JS
- Tailwind CSS ou système UI cohérent déjà présent
- React Query/TanStack Query si nécessaire
- Zod pour validation

IMPORTANT :

Le Web doit être une SPA statique compatible GitHub Pages.

Ne pas introduire de dépendance obligatoire à :

- SSR
- Server Actions
- API Routes Next.js
- serveur Node en production

Le frontend doit pouvoir être compilé :

pnpm build

et produire :

apps/web/dist

---

# 5. MOBILE

Technologies :

- Expo
- React Native
- TypeScript

Le mobile doit utiliser le même :

@darnalux/core

que le Web.

Ne pas dupliquer les règles métier.

Mobile destiné principalement à :

AGENT
TEAM_MEMBER
OWNER

---

# 6. MONOREPO

Structure cible :

apps/
  web/
  mobile/

packages/
  core/
  types/
  api/
  ui/
  config/

supabase/
  migrations/
  functions/
  seed/

docs/

.github/
  workflows/

Le repository doit utiliser :

pnpm

et :

Turborepo

si cela est déjà prévu dans le projet.

---

# 7. PACKAGE @darnalux/core

C'est une règle architecturale fondamentale.

Le package :

packages/core

contient la logique métier réutilisable.

Structure cible :

packages/core/
  src/
    domain/
      owners/
      properties/
      reservations/
      guests/
      tasks/
      checkin/
      checkout/
      finance/
      documents/
      marketing/

    application/
      owners/
      properties/
      reservations/
      tasks/
      finance/
      marketing/

    permissions/

    validators/

    calculations/

    policies/

    errors/

    types/

    index.ts

Le core ne doit pas dépendre de React.

Le core ne doit pas dépendre du navigateur.

Le core ne doit pas dépendre de React Native.

---

# 8. SUPABASE

Supabase est le backend principal.

Utiliser :

- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions

Les migrations doivent être versionnées dans :

supabase/migrations

Les Edge Functions doivent être versionnées dans :

supabase/functions

---

# 9. DATABASE

Construire progressivement le schéma.

Tables principales :

profiles
roles
permissions
user_roles

owners

properties
property_images
property_amenities
property_documents

platforms
property_listings

reservations
reservation_guests

guests
guest_documents
guest_verifications

tasks
task_checklists
task_attachments

checkins
checkouts

documents
contracts

financial_transactions
expenses
owner_statements

notifications

marketing_accounts
marketing_campaigns
marketing_ad_sets
marketing_ads
marketing_creatives
marketing_metrics

audit_logs

Ne pas créer toutes les tables aveuglément.

Construire les tables par domaine.

---

# 10. PRINCIPES DATABASE

Chaque table doit :

- avoir une clé primaire UUID ;
- utiliser created_at ;
- utiliser updated_at lorsque nécessaire ;
- utiliser des foreign keys ;
- avoir les indexes nécessaires ;
- avoir des contraintes ;
- avoir des valeurs contrôlées via enum/check lorsque pertinent.

Éviter :

- JSONB pour tout ;
- colonnes polymorphes inutiles ;
- duplication de données ;
- foreign keys inexistantes ;
- tables sans RLS.

---

# 11. RLS

Toutes les données métier sensibles doivent être protégées par Row Level Security.

Exemple :

OWNER :

peut lire uniquement :

- son profil ;
- ses propriétés ;
- les réservations de ses propriétés ;
- ses revenus ;
- ses documents ;
- les tâches/interventions concernant ses propriétés.

AGENT :

peut lire les propriétés nécessaires à ses tâches.

AGENT :

peut modifier uniquement les tâches/interventions qui lui sont attribuées selon les permissions.

ADMIN/MANAGER :

accès opérationnel selon permissions.

SUPER_ADMIN :

accès complet.

Ne jamais considérer le frontend comme une couche de sécurité.

La sécurité doit être appliquée côté PostgreSQL/Supabase.

---

# 12. AUTHENTIFICATION

Utiliser Supabase Auth.

MVP :

- email/password
- login
- logout
- reset password
- session persistence

Préparer l'architecture pour :

- Google
- MFA
- passkeys

mais ne pas implémenter ces fonctionnalités avant les étapes correspondantes.

---

# 13. MODULE 1 — AUTH + USERS

Commencer par :

1. Supabase Auth
2. profiles
3. roles
4. permissions
5. user_roles
6. RLS
7. login
8. logout
9. protected routes

Web :

/login

/app

Mobile :

Auth screen

Après authentification :

rediriger selon rôle.

---

# 14. MODULE 2 — PROPRIÉTAIRES

Créer :

Owner list
Owner detail
Owner create
Owner edit

Informations minimales :

first_name
last_name
email
phone
address
notes
status

Créer ensuite le portail propriétaire.

---

# 15. MODULE 3 — PROPRIÉTÉS

Une propriété appartient à un propriétaire.

Une propriété peut :

- être Airbnb ;
- être Booking.com ;
- être Airbnb + Booking ;
- être uniquement directe ;
- ne pas être publiée sur une plateforme.

Informations :

name
description
address
city
country
latitude
longitude
capacity
bedrooms
bathrooms
status
owner_id

Statuts :

ACTIVE
INACTIVE
MAINTENANCE
ARCHIVED

Créer :

PropertyList
PropertyDetail
PropertyCreate
PropertyEdit

---

# 16. MODULE 4 — LISTINGS

Une propriété peut avoir plusieurs listings.

Exemple :

Property
 |
 +-- Airbnb listing
 |
 +-- Booking listing
 |
 +-- Direct listing

Ne jamais considérer Airbnb ou Booking comme la source de vérité principale.

La propriété DarnaLux est la source de vérité.

---

# 17. MODULE 5 — RÉSERVATIONS

Créer :

ReservationList
ReservationDetail
ReservationCreate
ReservationEdit

Une réservation doit contenir au minimum :

property_id
source
guest_id
check_in
check_out
guests_count
gross_amount
commission
fees
owner_amount
status

Sources :

AIRBNB
BOOKING
DIRECT
WEBSITE
PHONE
WHATSAPP
OTHER

Statuts :

PENDING
CONFIRMED
CHECK_IN
IN_PROGRESS
CHECK_OUT
COMPLETED
CANCELLED
NO_SHOW

Créer des validations empêchant notamment :

check_out <= check_in

et les conflits de réservation.

---

# 18. MODULE 6 — CALENDRIER

Créer un calendrier :

- mois
- semaine
- jour

Afficher :

- réservations
- check-in
- check-out
- tâches
- interventions
- périodes bloquées
- maintenance

Préparer le calendrier pour recevoir ultérieurement les données Airbnb/Booking.

---

# 19. MODULE 7 — TÂCHES

Types :

CLEANING
CHECK_IN
CHECK_OUT
MAINTENANCE
INSPECTION
REPAIR
SUPPLIES
EMERGENCY
OTHER

Priorités :

LOW
NORMAL
HIGH
URGENT

Statuts :

TODO
ASSIGNED
IN_PROGRESS
BLOCKED
COMPLETED
CANCELLED

Créer :

TaskList
TaskDetail
TaskCreate
TaskEdit

Mobile doit permettre :

- voir ses tâches ;
- accepter une tâche ;
- démarrer ;
- terminer ;
- ajouter commentaire ;
- ajouter photos ;
- signaler un problème.

---

# 20. MODULE 8 — CHECK-IN

Préparer une architecture permettant :

guest
reservation
identity document
verification
consent
signature
completion

Ne pas inventer une intégration de vérification d'identité externe.

Créer une interface :

IdentityVerificationProvider

avec une implémentation mock pour le MVP.

---

# 21. MODULE 9 — CHECK-OUT

Permettre :

- inspection ;
- photos ;
- incidents ;
- dommages ;
- commentaire ;
- état de la propriété.

---

# 22. MODULE 10 — FINANCE

Calculs métier dans :

@darnalux/core

Exemple :

gross revenue
- platform fees
- DarnaLux commission
- expenses
=
owner net

Ne jamais mettre ces calculs directement dans React.

Créer des fonctions testables :

calculateReservationFinancials()

calculateOwnerNet()

calculateCommission()

---

# 23. MODULE 11 — DOCUMENTS

Supabase Storage.

Catégories :

OWNER
PROPERTY
GUEST
RESERVATION
CONTRACT
INVOICE
REPORT
OTHER

Les URLs privées doivent être générées via des mécanismes sécurisés.

Ne jamais rendre publics par défaut les documents sensibles.

---

# 24. MODULE 12 — NOTIFICATIONS

Préparer :

in_app
email
push

MVP :

in_app

Puis :

email

Puis :

push

Créer une architecture extensible :

NotificationProvider

---

# 25. MODULE 13 — DASHBOARD

Créer un dashboard DarnaLux.

KPIs :

- propriétés actives ;
- réservations ;
- check-ins ;
- check-outs ;
- tâches ouvertes ;
- interventions urgentes ;
- chiffre d'affaires ;
- commission DarnaLux ;
- revenu propriétaire ;
- taux d'occupation.

Les statistiques doivent provenir de données réelles.

Ne pas afficher de chiffres fictifs dans une version connectée à Supabase.

---

# 26. MODULE 14 — OWNER PORTAL

Le propriétaire doit disposer d'un espace complet.

Navigation :

Dashboard
Properties
Calendar
Reservations
Revenue
Tasks
Documents
Statistics

Le propriétaire ne doit jamais voir les données d'autres propriétaires.

---

# 27. MODULE 15 — MARKETING

Créer les entités :

MarketingAccount
MarketingCampaign
MarketingAdSet
MarketingAd
MarketingCreative
MarketingMetric

Relations :

Property
  ↓
Campaign
  ↓
AdSet
  ↓
Ad
  ↓
Metrics

Préparer les intégrations :

Meta Ads
Google Ads

Ne pas prétendre que les APIs sont connectées avant leur implémentation réelle.

---

# 28. MODULE 16 — AIRBNB / BOOKING

Créer des adapters :

AirbnbAdapter
BookingAdapter

Interface commune :

PropertyChannelAdapter

Méthodes potentielles :

getListings()
getReservations()
syncCalendar()
pushAvailability()
receiveWebhook()

IMPORTANT :

Ne pas inventer les endpoints ou credentials.

L'implémentation réelle devra utiliser les APIs officielles disponibles et les autorisations réellement obtenues par DarnaLux.

Pour le MVP :

MockAirbnbAdapter
MockBookingAdapter

---

# 29. EDGE FUNCTIONS

Créer progressivement :

supabase/functions/

  reservations/
  checkin/
  checkout/
  notifications/
  documents/
  finance/
  integrations/
  marketing/

Les Edge Functions doivent être minces.

Architecture :

Edge Function
      ↓
application service
      ↓
@darnalux/core
      ↓
database/repository

Ne pas mettre toute la logique métier dans les Edge Functions.

---

# 30. API / REPOSITORIES

Ne pas appeler Supabase directement depuis chaque composant.

Créer une couche repository/service.

Exemple :

PropertyRepository

ReservationRepository

TaskRepository

OwnerRepository

Puis :

UI
 ↓
Application service
 ↓
Repository
 ↓
Supabase

---

# 31. MOBILE OFFLINE

Préparer l'architecture pour offline-first.

MVP :

- cache des tâches ;
- cache propriétés nécessaires ;
- création locale des observations ;
- photos ;
- synchronisation lorsque la connexion revient.

Ne pas introduire une architecture offline extrêmement complexe au premier sprint.

Créer d'abord les interfaces nécessaires.

---

# 32. LANDING PAGE /

La route :

/

doit être une landing page publique.

Elle ne doit pas nécessiter d'authentification.

Objectif :

présenter DarnaLux.

Sections :

1. Header
2. Hero
3. Services
4. Gestion des propriétés
5. Réservations
6. Équipe de conciergerie
7. Propriétaires
8. Check-in / Check-out
9. Analytics
10. Marketing
11. CTA
12. Footer

Style :

premium
hospitality
moderne
minimal
professionnel

Éviter une landing page générique de startup SaaS.

Utiliser une identité visuelle inspirée :

- hospitality ;
- immobilier premium ;
- gestion de propriétés ;
- confiance ;
- élégance.

Le contenu doit être en français.

Préparer l'i18n pour français/arabe/anglais.

---

# 33. ROUTES WEB

Créer au minimum :

/
 
/login

/app

/app/dashboard

/app/properties

/app/properties/:id

/app/owners

/app/owners/:id

/app/reservations

/app/reservations/:id

/app/calendar

/app/tasks

/app/tasks/:id

/app/guests

/app/finance

/app/documents

/app/marketing

/app/notifications

/app/settings

/owner

/owner/properties

/owner/reservations

/owner/calendar

/owner/revenue

/owner/tasks

/owner/documents

---

# 34. DESIGN SYSTEM

Créer un système UI cohérent.

Principes :

- responsive ;
- accessible ;
- mobile-first lorsque pertinent ;
- composants réutilisables ;
- états loading ;
- états empty ;
- états error ;
- confirmation avant actions destructives ;
- notifications toast ;
- tables responsive ;
- formulaires avec validation.

Ne pas créer des styles différents pour chaque page.

Créer :

Button
Input
Select
Modal
Drawer
Card
Badge
Table
Tabs
Dropdown
DatePicker
Calendar
Toast
Skeleton
EmptyState
ErrorState

---

# 35. GITHUB PAGES

Le Web doit être compatible avec :

GitHub Pages.

Configurer :

vite.config.ts

avec la base appropriée pour GitHub Pages.

Le repository peut utiliser :

<repository-name>

comme base si nécessaire.

Créer :

404.html

pour supporter le routing SPA.

Créer GitHub Action :

.github/workflows/deploy-pages.yml

Workflow :

checkout
setup Node
setup pnpm
install
lint
typecheck
test
build
deploy

---

# 36. VERCEL FUTUR

Ne jamais écrire du code qui dépend exclusivement de GitHub Pages.

Le build doit également pouvoir être servi par Vercel.

La migration doit être :

GitHub Pages
      ↓
Vercel

et non :

rebuild application.

---

# 37. TESTS

Chaque domaine métier doit avoir des tests unitaires.

Exemples :

calculateCommission.test.ts
calculateOwnerNet.test.ts
reservationConflict.test.ts
permissions.test.ts

Tests UI lorsque nécessaire.

Tests d'intégration pour :

Auth
Properties
Reservations
Tasks

---

# 38. QUALITÉ CODE

Obligatoire :

TypeScript strict.

Éviter :

any

sauf justification explicite.

Utiliser :

Zod

pour les données externes et formulaires.

Utiliser des types explicites.

Éviter les fonctions de plusieurs centaines de lignes.

Favoriser :

Single Responsibility
Dependency Injection
Repository pattern
Adapter pattern
Domain-driven organization

sans sur-engineering.

---

# 39. SECURITY

Ne jamais mettre :

SERVICE_ROLE_KEY

dans le frontend.

Ne jamais mettre :

Airbnb secrets
Booking secrets
Meta secrets

dans le frontend.

Utiliser :

Supabase Edge Functions
GitHub Secrets
Supabase secrets

selon le contexte.

Toutes les opérations sensibles doivent être validées côté serveur.

---

# 40. AUDIT LOG

Créer :

audit_logs

Enregistrer les actions importantes :

CREATE
UPDATE
DELETE
LOGIN
LOGOUT
STATUS_CHANGE
DOCUMENT_ACCESS
FINANCIAL_CHANGE

Avec :

user_id
action
entity_type
entity_id
metadata
created_at

Ne pas enregistrer de secrets ou données sensibles inutilement.

---

# 41. DÉVELOPPEMENT PAR PHASES

NE PAS essayer d'implémenter tout le système en une seule réponse.

Travailler dans cet ordre :

PHASE 0
Architecture + tooling

PHASE 1
Auth + users + permissions

PHASE 2
Owners

PHASE 3
Properties

PHASE 4
Reservations

PHASE 5
Calendar

PHASE 6
Tasks

PHASE 7
Guest + check-in/out

PHASE 8
Finance

PHASE 9
Documents

PHASE 10
Owner Portal

PHASE 11
Dashboard / Analytics

PHASE 12
Marketing

PHASE 13
Airbnb / Booking adapters

PHASE 14
Notifications

PHASE 15
Mobile

PHASE 16
Offline

PHASE 17
Production hardening

---

# 42. RÈGLE DE TRAVAIL COPILOT

Avant chaque phase :

1. Inspecter le repository.
2. Identifier ce qui existe.
3. Ne pas recréer ce qui existe.
4. Vérifier les dépendances.
5. Vérifier les conventions du projet.
6. Proposer les fichiers à modifier/créer.
7. Implémenter.
8. Exécuter les tests.
9. Exécuter le typecheck.
10. Exécuter le lint.
11. Exécuter le build.
12. Corriger les erreurs.
13. Résumer les changements.

Après chaque phase, produire :

### Implemented

liste des fonctionnalités.

### Files changed

liste des fichiers.

### Database

migrations ajoutées.

### Tests

tests exécutés.

### Remaining

ce qui reste à faire.

---

# 43. RÈGLE IMPORTANTE SUR LES MODIFICATIONS

Avant de modifier un fichier important :

- lire son contenu ;
- comprendre ses imports ;
- comprendre ses dépendances ;
- préserver les fonctionnalités existantes.

Ne jamais remplacer un fichier complet simplement parce qu'une nouvelle implémentation est plus simple.

Faire des modifications minimales et cohérentes.

---

# 44. RÈGLE SUR LES MIGRATIONS

Chaque changement de database doit être une migration séparée.

Format :

YYYYMMDDHHMMSS_description.sql

Ne jamais modifier silencieusement une migration déjà appliquée.

Si une migration existante doit être corrigée :

créer une nouvelle migration corrective.

---

# 45. RÈGLE SUR SUPABASE

Lorsque Supabase n'est pas encore connecté :

utiliser des interfaces/adapters/mock.

Ne pas créer une fausse base de données permanente dans localStorage pour simuler le backend.

localStorage peut être utilisé uniquement pour :

- préférences UI ;
- état temporaire ;
- cache explicitement prévu.

---

# 46. RÈGLE SUR LES DONNÉES

Aucune donnée fictive ne doit être présentée comme donnée réelle.

Pour les previews UI, utiliser explicitement :

DemoData
MockData

et séparer ces données de la logique production.

---

# 47. PREMIÈRE MISSION

Commencer maintenant par PHASE 0.

PHASE 0 doit :

1. Inspecter le repository complet.
2. Vérifier la structure monorepo.
3. Vérifier pnpm.
4. Vérifier Turborepo.
5. Vérifier apps/web.
6. Vérifier apps/mobile.
7. Vérifier packages/core.
8. Vérifier supabase.
9. Vérifier GitHub Actions.
10. Vérifier GitHub Pages.
11. Vérifier le build Web.
12. Vérifier que "/" est une landing page.
13. Vérifier que "/app" peut être réservé à l'application.
14. Corriger uniquement les problèmes nécessaires.
15. Ne PAS commencer encore les modules métier.

Ensuite, afficher :

ARCHITECTURE AUDIT

avec :

- état actuel ;
- problèmes détectés ;
- fichiers concernés ;
- corrections proposées.

Puis implémenter uniquement les corrections de PHASE 0.

---

# 48. PREMIÈRE PRIORITÉ

La priorité absolue est :

ARCHITECTURE STABLE
+
BUILD STABLE
+
GITHUB PAGES STABLE
+
CODE TYPE-SAFE
+
BASE SUPABASE PROPRE
+
@darnalux/core PROPRE

avant de développer les fonctionnalités métier.

---

# 49. OBJECTIF FINAL

À la fin du projet :

Web
  ↓
@darnalux/core
  ↓
Supabase

Mobile
  ↓
@darnalux/core
  ↓
Supabase

Edge Functions
  ↓
@darnalux/core
  ↓
Supabase

Le système doit rester cohérent entre les trois interfaces.

Le Web doit être déployable sur :

GitHub Pages
ET
Vercel

sans réécriture du produit.

Le mobile doit être déployable via :

Expo/EAS.

Le backend doit être déployable via :

Supabase.

GitHub doit rester la source de vérité du code.

---

# 50. COMMUNICATION

Ne pas demander 20 décisions à l'utilisateur.

Lorsqu'une décision est nécessaire :

- expliquer brièvement le problème ;
- proposer une solution par défaut ;
- poser au maximum 2 questions.

Si une décision n'est pas bloquante :

prendre une décision raisonnable et documenter l'hypothèse.

---

# COMMENCER

Commence maintenant par :

PHASE 0 — ARCHITECTURE AUDIT

Ne développe pas encore les modules métier.

Inspecte d'abord le repository existant et rapporte précisément son état.