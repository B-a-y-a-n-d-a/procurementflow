-- T122: email + password sign-in. BCrypt hash; NULL means the account can't sign in yet.
ALTER TABLE app_user ADD COLUMN password_hash VARCHAR(100) NULL;
