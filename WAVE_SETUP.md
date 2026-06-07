# Configuration du Paiement Wave — UVCI Resto

## Architecture de sécurité

```
[Utilisateur] 
    → Clique "Payer avec Wave"
    → Frontend crée la commande en `pending_payment` + `payment_status=unpaid`
    → Appel Edge Function `wave-checkout` (authentifié JWT)
    → Edge Function crée le checkout via API Wave
    → Retourne `wave_launch_url`
    → Frontend redirige vers `/payment?orderId=...`
    → Page de vérification : polling + Realtime Supabase
    → Wave appelle le webhook `wave-webhook` (vérifié HMAC)
    → Edge Function met à jour `payment_status=paid` + `status=pending`
    → Realtime déclenche la mise à jour côté frontend
    → Toast succès + redirection /orders
```

**Aucune validation ne vient du frontend.** Seul le webhook Wave (backend) peut passer une commande à `paid`.

---

## 1. Migration SQL

Exécuter dans Supabase Dashboard → SQL Editor :

```sql
-- Copier le contenu de supabase/migrations/001_wave_payment.sql
```

---

## 2. Edge Functions à déployer

```bash
supabase functions deploy wave-checkout
supabase functions deploy wave-webhook
```

---

## 3. Secrets Supabase à configurer

Dans Supabase Dashboard → Edge Functions → Secrets :

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `WAVE_API_KEY`        | Clé API Wave CI (obtenue sur wave.com/business) |
| `WAVE_WEBHOOK_SECRET` | Secret HMAC pour vérifier les webhooks Wave |
| `APP_URL`             | URL de déploiement (ex: https://uvci-resto.vercel.app) |

```bash
supabase secrets set WAVE_API_KEY=wave_ci_...
supabase secrets set WAVE_WEBHOOK_SECRET=whsec_...
supabase secrets set APP_URL=https://uvci-resto.vercel.app
```

---

## 4. Configurer le webhook dans Wave

Dans le dashboard Wave Business :
- URL du webhook : `https://<SUPABASE_URL>/functions/v1/wave-webhook`
- Événements à écouter :
  - `checkout.completed`
  - `payment.succeeded`
  - `payment.failed`
  - `checkout.expired`
  - `payment.cancelled`
- Copier le `WAVE_WEBHOOK_SECRET` généré par Wave

---

## 5. Mode simulation (développement)

Si `WAVE_API_KEY` n'est pas défini, l'edge function `wave-checkout` fonctionne en mode simulation :
- Génère une URL Wave directe avec le montant et la référence
- Crée un `wave_checkout_id` simulé (préfixe `sim_`)
- Le webhook doit être déclenché manuellement via le dashboard Supabase pour simuler la confirmation

---

## 6. Tester manuellement une confirmation

Pour simuler un paiement réussi en développement (SQL Editor Supabase) :

```sql
UPDATE orders
SET
  payment_status    = 'paid',
  status            = 'pending',
  transaction_id    = 'test_tx_' || gen_random_uuid(),
  payment_reference = wave_client_ref,
  paid_at           = NOW()
WHERE id = '<ORDER_ID>';
```

---

## 7. Statuts de commande

| `status`          | `payment_status` | Signification                        |
|-------------------|------------------|--------------------------------------|
| `pending_payment` | `unpaid`         | Commande créée, Wave non encore payé |
| `pending_payment` | `pending`        | Checkout Wave créé, en attente       |
| `pending`         | `paid`           | Paiement confirmé, en préparation    |
| `ready`           | `paid`           | Prêt à retirer                       |
| `delivered`       | `paid`           | Terminée                             |
| `payment_failed`  | `failed`         | Paiement refusé par Wave             |
| `cancelled`       | `cancelled`      | Annulée par l'utilisateur            |

---

## 8. Sécurité implémentée

- ✅ Signature HMAC-SHA256 vérifiée sur chaque webhook
- ✅ Anti double-paiement (vérification `payment_status === 'paid'`)
- ✅ Vérification du montant (anti-fraude)
- ✅ JWT vérifié sur l'edge function `wave-checkout`
- ✅ Vérification que la commande appartient à l'utilisateur connecté
- ✅ Audit trail complet dans `payment_events`
- ✅ Idempotency-Key sur l'appel Wave (évite les doublons réseau)
- ✅ Aucune mise à jour `payment_status` possible depuis le frontend (RLS)
