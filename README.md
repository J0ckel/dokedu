# Dokedu

Dokedu is a software to support the management and evaluation of learning progress

## Local development

Install Docker Desktop and Bun, then run the following commands from the repository root:

```sh
docker compose up -d postgres
bun install
bun run db:migrate
bun run dev
```

The local application is available at `http://localhost:3005`. Local database data is stored in the `dokedu-postgres-data` Docker volume. Uploaded files are kept in `storage/files` and no S3 or Postmark credentials are configured by default.

**[Learn more about Dokedu](https://dokedu.org)**

<br />

© 2019-present, Dokedu UG (haftungsbeschränkt)
