# Rinrobou-Studios-Storefront

A digital storefront for Rinrobou Studio's commissions and order management.

## Commission requests

The commission page and API run from the TypeScript server:

```sh
npm install
npm start
```

Node.js 22.6 or newer is required for native TypeScript type stripping.
Open `http://localhost:3000/commission.html`. The server accepts requests at
`POST /api/commissions` and stores request details in the MySQL `commissions`
table. Apply `database.sql` to the database before submitting requests.

Set `HOST`, `DB_PORT`, `USER`, `PASSWORD`, and `DATABASE` in
`databaseDetails.env` (see `databaseDetails.env.example`). The server also
accepts the `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` aliases. Uploaded references are stored privately in
`commission-uploads/`; keep that directory backed up and do not serve it as a
public static directory.
