Landing page de Hondu.tech

## Backend SQL del predictor

Se agrego un setup SQL para migrar el ranking desde JSON a MySQL 8.

Archivos:
- backend/sql/01_schema.sql
- backend/sql/02_seed_wc2026.sql
- backend/sql/03_endpoint_queries.sql

Orden de ejecucion:
1. Ejecutar backend/sql/01_schema.sql
2. Ejecutar backend/sql/02_seed_wc2026.sql
3. Usar backend/sql/03_endpoint_queries.sql como base para los endpoints:
	- GET /api/ranking
	- POST /api/ranking/submit

Notas:
- El seed se genero desde src/data/worldCup2026Data.ts para mantener consistencia con frontend.
- Los scripts son idempotentes (usan on duplicate key update o insert ignore segun corresponda).
- Se incluye la tabla knockout_progression para definir explicitamente los rivales desde 16vos en adelante (incluye final y tercer puesto).

Variables de entorno para backend MySQL:
- MYSQL_HOST
- MYSQL_PORT (default 3306)
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DATABASE
- WC_TOURNAMENT_CODE (default WC2026)
- PORT (Railway lo define automaticamente)
- API_PORT (default 8787, solo para uso local si PORT no existe)

En Railway, si usas el servicio MySQL interno, puedes usar estas referencias:
- MYSQL_HOST=${{MySQL.MYSQLHOST}}
- MYSQL_PORT=${{MySQL.MYSQLPORT}}
- MYSQL_USER=${{MySQL.MYSQLUSER}}
- MYSQL_PASSWORD=${{MySQL.MYSQLPASSWORD}}
- MYSQL_DATABASE=${{MySQL.MYSQLDATABASE}}

Deploy recomendado en Railway:
- Build command: npm run build
- Start command: npm run start

El comando start levanta Express, sirve los endpoints /api y tambien el frontend compilado en dist.
