# Wedding Planner operations

## Supported boundary

The governed path covers tenant/location/privacy boundaries, versioned vendor services, availability, prices, schedules and quantities, durable orders, exact pricing, payment/refund state, independent service approval, consented communications, provider reconciliation, and recovery. Payment, tax, inventory, scheduling, messaging, accounting, delivery, vendor portal, venue, and webhook names are typed contracts—not claims that live partners are connected.

The application never autonomously commits a vendor, captures/refunds payment, or sends a communication without approved state and consent. Generated routes are disabled by default and cannot be enabled in production.

## Deploy and run

Install dependencies explicitly in `backend/` and `frontend/`. Configure `.env` from `.env.example` with `DATABASE_URL`, unique `GOVERNANCE_TENANT_ID`, and a random `JWT_SECRET` of at least 32 characters. Keep payment/vendor credentials in a secret manager.

Use `./start.sh check`; after SQL review and backup use `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`; then `./start.sh start`. Startup performs no installation, schema mutation, seeding, or unrelated process termination.

## Workflow and recovery

Create a subject-scoped order at `/api/governance` with versioned authoritative inputs, provenance and `Idempotency-Key`, submit it, and obtain a different authorized reviewer’s decision. Queue approved provider operations through the leased outbox and persist typed receipts. On price/availability conflict, partial payment, duplicate webhook, vendor rejection, delivery failure, refund ambiguity, or revoked communication consent, stop commitment, reconcile providers, and resume or reverse the same durable order using its original idempotency key.

Run `node --test backend/governance/tests/*.test.js` and `bash -n start.sh`. Failure fixtures cover payment, tax, inventory, schedule, message, delivery, and refund faults. Destructive demo fixtures require explicit opt-in and environment-supplied credentials on a disposable database.
