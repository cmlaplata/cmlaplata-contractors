# 🚀 Guía de Despliegue Web - app.cmlaplata.com

Esta guía te ayudará a desplegar la versión web de la aplicación CM La Plata en el subdominio `app.cmlaplata.com`.

## 📋 Prerrequisitos

- Node.js y pnpm instalados
- Acceso al servidor/hosting donde se desplegará
- Acceso al panel DNS para configurar el subdominio
- Credenciales de acceso al hosting

## 🔧 Paso 1: Preparar el Build de Producción

### 1.1 Instalar dependencias (si no están instaladas)
```bash
pnpm install
```

### 1.2 Construir la versión web de producción
```bash
pnpm run build:web
```

Esto generará una carpeta `dist/` con todos los archivos estáticos listos para desplegar.

**Nota:** Este proyecto usa Metro como bundler, por lo que usamos `expo export --platform web` en lugar de `expo export:web` (que solo funciona con Webpack).

## 🌐 Paso 2: Elegir Plataforma de Hosting

Tienes varias opciones. Elige la que mejor se adapte a tus necesidades:

### Opción A: Vercel (Recomendado - Gratis y fácil)

**Ventajas:**
- ✅ Despliegue automático desde Git
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Gratis para proyectos personales
- ✅ Configuración de dominio muy simple

**Pasos:**

1. **Instalar Vercel CLI** (si no lo tienes):
   ```bash
   npm i -g vercel
   ```

2. **Iniciar sesión en Vercel**:
   ```bash
   vercel login
   ```

3. **Desplegar**:
   ```bash
   vercel --prod
   ```
   - Te pedirá configurar el proyecto
   - Selecciona la carpeta `dist` como directorio de salida
   - O configura `vercel.json` (ver más abajo)

4. **Configurar dominio personalizado**:
   - Ve a tu proyecto en [vercel.com](https://vercel.com)
   - Settings → Domains
   - Agrega `app.cmlaplata.com`
   - Configura el DNS según las instrucciones de Vercel

5. **Configurar DNS en tu proveedor**:
   - Agrega un registro CNAME:
     - Nombre: `app`
     - Valor: `cname.vercel-dns.com` (o el que Vercel te indique)

### Opción B: Netlify (Alternativa gratuita)

**Pasos:**

1. **Instalar Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Iniciar sesión**:
   ```bash
   netlify login
   ```

3. **Desplegar**:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. **Configurar dominio**:
   - En el dashboard de Netlify, ve a Domain settings
   - Agrega `app.cmlaplata.com`
   - Configura el DNS según las instrucciones

### Opción C: Servidor Propio (VPS/Shared Hosting)

Si tienes un servidor propio o hosting compartido:

**Pasos:**

1. **Subir archivos**:
   - Usa FTP, SFTP o SCP para subir el contenido de `dist/` a tu servidor
   - Normalmente va en una carpeta como `public_html/app` o similar

2. **Configurar servidor web** (Nginx ejemplo):
   ```nginx
   server {
       listen 80;
       server_name app.cmlaplata.com;
       
       root /ruta/a/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Configurar SSL/HTTPS** (Recomendado):
   - Usa Let's Encrypt con Certbot:
   ```bash
   certbot --nginx -d app.cmlaplata.com
   ```

4. **Configurar DNS**:
   - Agrega un registro A apuntando a la IP de tu servidor
   - O un registro CNAME si usas un servicio de hosting

## ⚙️ Paso 3: Configuración Adicional

### 3.1 Variables de Entorno

Si tu app usa variables de entorno, asegúrate de configurarlas en tu plataforma de hosting:

- **Vercel**: Settings → Environment Variables
- **Netlify**: Site settings → Environment variables
- **Servidor propio**: Configúralas según tu servidor web

### 3.2 Configuración de Expo Router para Web

Expo Router debería funcionar automáticamente, pero si tienes problemas con rutas, asegúrate de que tu servidor esté configurado para servir `index.html` en todas las rutas (SPA routing).

### 3.3 Archivo vercel.json (si usas Vercel)

Crea un archivo `vercel.json` en la raíz del proyecto:

```json
{
  "buildCommand": "pnpm run build:web",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3.4 Archivo netlify.toml (si usas Netlify)

Crea un archivo `netlify.toml` en la raíz:

```toml
[build]
  command = "pnpm run build:web"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🔄 Paso 4: Despliegue Continuo (CI/CD)

Para automatizar los despliegues:

### Con Vercel:
- Conecta tu repositorio Git
- Los despliegues se harán automáticamente en cada push a `main` o `master`

### Con Netlify:
- Conecta tu repositorio Git
- Configura el build command: `pnpm run build:web`
- Configura el publish directory: `dist`

### Con GitHub Actions (para servidor propio):
Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy Web

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run build:web
      - name: Deploy to server
        uses: SamKirkland/FTP-Deploy-Action@4.3.0
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./dist/
```

## ✅ Paso 5: Verificar el Despliegue

1. Visita `https://app.cmlaplata.com` (o `http://` si aún no tienes SSL)
2. Verifica que todas las rutas funcionen correctamente
3. Prueba la autenticación y funcionalidades principales
4. Revisa la consola del navegador por errores

## 🐛 Solución de Problemas

### Problema: Las rutas no funcionan (404)
**Solución**: Asegúrate de que tu servidor esté configurado para redirigir todas las rutas a `index.html` (SPA routing).

### Problema: Errores de CORS
**Solución**: Verifica que tu API backend permita requests desde `app.cmlaplata.com`.

### Problema: Variables de entorno no funcionan
**Solución**: Asegúrate de que las variables usen el prefijo `EXPO_PUBLIC_` y estén configuradas en tu plataforma de hosting.

### Problema: Assets no se cargan
**Solución**: Verifica que la ruta base esté configurada correctamente en `app.json` si es necesario.

## 📝 Notas Importantes

- El build de producción optimiza y minifica el código automáticamente
- Asegúrate de que tu API backend esté accesible desde internet (no solo localhost)
- Considera usar HTTPS para mayor seguridad
- Revisa la configuración de Firebase si usas servicios de Firebase en web

## 🔗 Recursos Útiles

- [Documentación de Expo Web](https://docs.expo.dev/workflow/web/)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [Expo Router Web](https://docs.expo.dev/router/introduction/)

---

**¿Necesitas ayuda?** Revisa los logs de build y despliegue en tu plataforma de hosting.

