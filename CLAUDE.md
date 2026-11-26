# Notes

- When adding a field to `Settings` (src/types.ts), existing users' saved data and old backups won't have it. Give it a default in `reviveStoreDates` (src/helpers/serializers.ts) and mark it optional in the `StoredStore` type, as `unansweredAskExpiryDays` does. Also add it to the empty-store default in src/storage.ts. Nothing catches a missing default, neither the type check nor a runtime error: the field is just `undefined` for those users.
