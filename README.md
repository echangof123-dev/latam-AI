# Eje Uno

ERP SaaS multiempresa. La marca madre es **Eje Uno**; la atención por voz/WhatsApp es un producto encima del núcleo operativo.

## Qué hay ahora

- Superadmin: crea negocios, asigna uno o varios números, activa o apaga módulos.
- Dueño: agenda, clientes, servicios, personal, sucursales, inventario, facturación, ventas, reportes y rendimiento de IA.
- Canal de entrada: identifica el negocio por el número destino, carga su catálogo y agenda/cancela/reprograma **sin mostrar el chat al dueño** (solo avisos).
- Datos separados por `tenantId` en toda la base.

## Arranque local

```bash
cp .env.example .env
docker compose up db -d
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abre http://localhost:3000

| Usuario | Rol |
|---|---|
| nathan.k@example.net | Superadmin |
| tina.r@example.net | Barbería Norte (`+573001110001`) |
| iris.p@example.org | Clínica Alma (`+573001110002`) |

Clave: `ejeuno123`

Prueba la IA en Superadmin → **Probar canal**, o:

```bash
curl -X POST http://localhost:3000/api/channels/inbound \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"+573001110001\",\"from\":\"+573109998877\",\"text\":\"Hola, quiero un corte\"}"
```

## Docker completo

```bash
docker compose up --build
```

## Publicar en internet (Render)

No se publica solo desde esta carpeta: hace falta un servicio en la nube (app + Postgres). El camino más directo:

1. Crea una cuenta en [GitHub](https://github.com/signup) y otra en [Render](https://render.com).
2. Sube este proyecto a un repositorio GitHub (botón **Add file → Upload files** si aún no usas Git).
3. En Render: **New → Blueprint** y conecta ese repositorio. Detectará `render.yaml`.
4. Confirma el plan (Postgres + web). Render te dará una URL tipo `https://ejeuno-web.onrender.com`.
5. Entra con `nathan.k@example.net` / `ejeuno123` y **cambia esa clave** en cuanto puedas.

Variables que ya quedan definidas por el blueprint: `DATABASE_URL`, `AUTH_SECRET`, `RUN_SEED=true` (carga los negocios de demo la primera vez). Después pon `RUN_SEED` en `false` para no reinsertar avisos en cada reinicio.

Dominio propio (cuando tengas `ejeuno.com` u otro): en el servicio web → **Custom Domain** → pega el dominio y crea el CNAME que Render indique.

### Alternativa: Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub.
2. Add **PostgreSQL**.
3. En la app, variables: `DATABASE_URL` (la de Postgres), `AUTH_SECRET` (una frase larga), `RUN_SEED=true`.
4. Railway asigna `PORT` solo; el contenedor ya escucha esa variable.

Mientras Docker Desktop no esté encendido y Node no esté instalado en el PC, el despliegue tiene que hacerse **desde GitHub + el panel de Render/Railway**, no desde `npm run dev`.
