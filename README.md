
# 🍽️ UVCI Resto App

**Une solution complète de gestion de restauration universitaire.**

> **Version:** 1.0.0 (Stable)  
> **Statut:** Prototype Fonctionnel  
> **Architecture:** SPA (Single Page Application) Hybrid / Next.js

---

## 📋 Description

**UVCI Resto App** est une application web moderne conçue pour digitaliser le service de restauration du campus UVCI. Elle fluidifie le parcours utilisateur, de la consultation du menu jusqu'au retrait de la commande, tout en offrant aux gérants un outil puissant pour piloter l'activité en temps réel.

L'application résout les problèmes de files d'attente et de gestion de stock grâce à une interface intuitive et réactive.

## ✨ Fonctionnalités Clés

### 👤 Espace Client (Étudiants & Personnel)
*   **Menu Interactif & Temps Réel :** Affichage des plats avec filtrage par catégorie et recherche instantanée.
*   **Gestion des Options (Nouveau) :** Personnalisation des plats (ex: Choix d'accompagnement *Riz* ou *Attiéké*, suppléments payants).
*   **Panier Intelligent :** Gestion des quantités, calcul dynamique du total.
*   **Paiement Flexible :** Simulation d'intégration **Wave** (Mobile Money) ou paiement Espèces.
*   **Historique & Suivi :** Page "Mes Commandes" avec code couleur pour le statut (*En préparation* 🟠, *Disponible* 🔵, *Terminée* 🟢).

### 👮 Espace Administrateur (Back-Office)
*   **Dashboard Sécurisé :** Accès restreint aux administrateurs.
*   **Flux de Commandes Live :** Vue d'ensemble des commandes entrantes.
*   **Détails de Commande :** Visualisation précise des plats commandés **ET** des options choisies par le client.
*   **Workflow de Statut :** Mise à jour du statut des commandes (`Pending` → `Ready` → `Delivered`) pour notifier le client.
*   **Gestion du Menu (CRUD) :** Ajout, modification et suppression de plats et de leurs options associées.

---

## 🛠️ Stack Technique

*   **Frontend :** React 18, Next.js 14 (App Router adapté SPA).
*   **Langage :** TypeScript (Typage strict pour la robustesse).
*   **Styling :** Tailwind CSS (Design System responsive & animations 3D).
*   **Base de Données & Auth :** Supabase (PostgreSQL).
*   **Icônes :** Lucide React.
*   **Notifications :** React Toastify.
*   **Navigation :** HashRouter personnalisé (Compatible environnements restreints).

---

## 🔐 Identifiants de Démonstration

Pour tester l'application, utilisez les comptes suivants :

### 👑 Accès Administrateur (Gestion complète)
*   **Email :** `resto@uvci.edu.ci`
*   **Mot de passe :** `@resto5599`

### 🎓 Accès Étudiant (Simulation)
*   **Email :** `etudiant@uvci.edu.ci` *(Ou créez un compte via "Inscription")*
*   **Note :** L'inscription est restreinte aux emails se terminant par `@uvci.edu.ci`.

---

## ⚙️ Installation & Démarrage

### 1. Cloner le projet
```bash
git clone https://github.com/votre-repo/uvci-resto-app.git
cd uvci-resto-app
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration d'environnement
Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_publique
```

### 4. Lancer le serveur de développement
```bash
npm run dev
```
Accédez à l'application via `http://localhost:3000`.

---

## 🗄️ Structure de la Base de Données (Aperçu)

*   `users` (public) : Extension de la table auth pour les clés étrangères.
*   `profiles` : Rôles utilisateurs (admin/student).
*   `menu_items` : Plats disponibles.
*   `meal_options` : Options liées aux plats (Riz, Alloco, Sauce...).
*   `orders` : Commandes (Status: pending, ready, delivered).
*   `order_items` : Liaison Commande <-> Plats + Options (Stockage JSON/Array).

---
*Développé avec ❤️ pour l'UVCI.*
