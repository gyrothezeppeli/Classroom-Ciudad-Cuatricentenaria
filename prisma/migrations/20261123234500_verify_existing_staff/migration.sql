UPDATE "User"
SET "emailVerified" = COALESCE("emailVerified", "createdAt"),
    "aprobado" = true
WHERE "role" IN ('DOCENTE', 'ADMIN', 'COORDINACION')
