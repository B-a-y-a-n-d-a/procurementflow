# Database: `civicflow.sql`

`civicflow.sql` is a complete MySQL 8 export of the CIVICFLOW database: the schema, the Flyway history and the
seeded **Mzansi Metro** dataset (a fictional municipality). The app **no longer seeds itself**: this script is how data
gets into the database.

| | |
| --- | --- |
| Target | MySQL 8.0 / 8.4 (tested on 8.4), `utf8mb4` |
| Creates | database `civicflow` (26 tables incl. `flyway_schema_history`) |
| Contains | 23 user accounts, 5 departments, 13 providers, 12 public needs, 5 opportunities, 3 implementations with 7 impact metrics, a verified 135-entry audit chain |
| Dates | Frozen at the export date (26 Sept 2026). SLAs and "days ago" labels are relative to that date |

## Import with MySQL Workbench

1. Connect to your MySQL server as a user that can create databases (e.g. `root`).
2. **File → Run SQL Script…**, choose `database/civicflow.sql`, leave *Default Schema* empty and click **Run**.
   (Alternatively: **Server → Data Import → Import from Self-Contained File**.)
3. Refresh the *Schemas* panel: `civicflow` appears with its tables.
4. Create the application user the backend connects with (skip if it exists):
   ```sql
   CREATE USER IF NOT EXISTS 'civicflow'@'%' IDENTIFIED BY 'change-me';
   GRANT ALL PRIVILEGES ON civicflow.* TO 'civicflow'@'%';
   ```
   Then point the backend at it with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` (see the main README).

> ⚠️ The script **drops and recreates** every CIVICFLOW table. Don't run it against a database that holds data you want
> to keep.

Because `flyway_schema_history` is included, the backend recognises the schema as already migrated (V1, V2) and only
applies newer migrations on start.

**With Docker** you don't need Workbench: `docker compose up` mounts this file into MySQL's init directory, so a **new**
(empty) `mysql-data` volume imports it automatically on first start. To re-import from scratch:
`docker compose down -v && docker compose up`.

## Sign-in accounts

Every seeded account signs in with its email and the same shared password:

| | |
| --- | --- |
| Email | `<first name>@mzansimetro.example.org`, e.g. `thandi@…`, `sipho@…`, `lerato@…`, `johan@…`, `nomsa@…`, `ayesha@…`, `grace@…`, `lindiwe@…` |
| Password | `Civic-7mtM3GzdCM!` |

See the main README for who each account is. **This password is public (it's in this repository).** Change it before
the database holds anything real:

```sql
-- BCrypt hash of the new password. Generate one with e.g.  htpasswd -bnBC 10 "" 'NewPassw0rd!' | tr -d ':\n'
UPDATE civicflow.app_user SET password_hash = '$2y$10$...' WHERE email = 'thandi@mzansimetro.example.org';
-- or disable an account entirely:
UPDATE civicflow.app_user SET is_active = FALSE WHERE email = '...';
```

A `NULL` `password_hash` means the account can't sign in.

## Regenerating the script

The seeder (`backend/.../seed/DemoDataSeeder.java`) replays the whole scenario through the real services. To produce a
fresh export (e.g. after a schema change), run it once against an **empty** database and dump the result:

```bash
# throwaway stack on other ports so your normal database is untouched
SEED_USER_PASSWORD='choose-one' MYSQL_PORT=3307 BACKEND_PORT=8082 \
  docker compose -p civicflow-seedgen -f docker-compose.yml -f database/seedgen.override.yml up -d --build mysql backend
# once the backend is healthy:
docker compose -p civicflow-seedgen exec -T mysql sh -c \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases civicflow --single-transaction --no-tablespaces \
   --set-gtid-purged=OFF --skip-dump-date --default-character-set=utf8mb4' > database/civicflow.sql
docker compose -p civicflow-seedgen down -v
```

Then restore the header comment at the top of `civicflow.sql` and update the password above.
