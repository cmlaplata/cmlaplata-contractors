# CM La Platas - App de Gestión de Leads

Aplicación React Native con Expo para gestionar leads de Facebook. Funciona en Web, iOS y Android.

## 🚀 Características

- ✅ Autenticación de usuarios
- ✅ Dashboard para gestión de leads
- ✅ Estadísticas de leads
- ✅ CRUD completo de leads
- ✅ Filtrado por cliente
- ✅ Interfaz responsive para web y móvil

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- pnpm (o npm/yarn)
- Expo CLI (se instala automáticamente)

## 🔧 Instalación

1. **Clonar el repositorio** (si aplica)

2. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno:**
   
   Crear archivo `.env` en la raíz del proyecto:
   ```env
   # Producción:
   EXPO_PUBLIC_API_URL=https://cmlaplata.ar/api
   
   # Desarrollo local:
   # EXPO_PUBLIC_API_URL=http://localhost:3001
   ```
   
   **Nota:** La aplicación usa Firebase Authentication. Las credenciales de Firebase están configuradas en `src/config/firebase.ts`.

## 🏃 Ejecutar la Aplicación

### Web
```bash
pnpm run web
```

### iOS (requiere macOS)
```bash
pnpm run ios
```

### Android

**Pasos para ejecutar en el emulador:**

1. **Iniciar el emulador Android:**
   ```bash
   emulator -avd cmlaplata
   ```
   > ⚠️ **Importante:** Espera a que el emulador se inicie completamente (pantalla de inicio de Android visible) antes de continuar.

2. **Instalar Expo Go en el emulador:**
   - Abre Google Play Store en el emulador
   - Busca "Expo Go" e instálalo

3. **Iniciar la aplicación:**
   ```bash
   pnpm android
   ```
   O si prefieres el menú interactivo:
   ```bash
   pnpm start
   ```
   Luego presiona `a` para abrir en Android.

**Nota:** Si tienes múltiples emuladores, verifica cuál está activo con:
```bash
adb devices
```

**Solución si Expo intenta usar un emulador incorrecto:**

Si Expo intenta conectarse a un emulador que no funciona (ej: emulator-5554), puedes:

1. **Desconectar el emulador problemático:**
   ```bash
   adb disconnect emulator-5554
   ```

2. **Configurar el puerto manualmente en el emulador correcto:**
   ```bash
   adb -s emulator-5556 reverse tcp:8081 tcp:8081
   ```
   (Reemplaza `emulator-5556` con el ID de tu emulador)

3. **Iniciar Expo sin conexión automática:**
   ```bash
   pnpm start
   ```
   Luego presiona `a` y selecciona el dispositivo correcto del menú.

### Desarrollo general
```bash
pnpm start
```

## 📁 Estructura del Proyecto

```
├── app/                    # Rutas con Expo Router
│   ├── (auth)/            # Rutas de autenticación
│   │   └── login.tsx
│   ├── (tabs)/            # Rutas principales
│   │   └── dashboard.tsx
│   ├── _layout.tsx        # Layout principal
│   └── index.tsx          # Página inicial
├── src/
│   ├── components/        # Componentes React
│   │   ├── FacebookLeadsList.tsx
│   │   ├── FacebookLeadsPage.tsx
│   │   ├── LeadForm.tsx
│   │   └── LeadsStats.tsx
│   ├── context/           # Contextos de React
│   │   └── AuthContext.tsx
│   ├── hooks/             # Hooks personalizados
│   │   ├── useFacebookLeads.ts
│   │   ├── useLeadsStats.ts
│   │   └── useLeadOperations.ts
│   └── services/          # Servicios API
│       ├── authService.ts
│       └── facebookLeadsService.ts
├── assets/                # Imágenes y recursos
├── app.json               # Configuración de Expo
└── package.json
```

## 🔐 Autenticación

La aplicación usa **Firebase Authentication** para la autenticación de usuarios:

- **Login**: Pantalla de inicio de sesión con Firebase Auth
- **Protección de rutas**: Las rutas están protegidas automáticamente
- **Tokens JWT**: Firebase genera tokens que se envían automáticamente al backend
- **Observador de estado**: El estado de autenticación se sincroniza automáticamente
- **Logout**: Botón de cerrar sesión en el header

### Flujo de Autenticación

1. Usuario ingresa email y contraseña
2. Firebase Auth valida las credenciales
3. Se obtiene el ID Token de Firebase
4. Se consulta el backend para obtener datos del usuario: `GET /users/byFireBaseId/:firebaseId`
5. El token se incluye automáticamente en todas las peticiones al backend

### Endpoints del Backend

- **Obtener usuario**: `GET {API_URL}/users/byFireBaseId/:firebaseId`
  - Requiere: Header `Authorization: Bearer <firebase_id_token>`
  - Retorna: Datos del usuario con `userType` (Admin, Manager, Seller)

## 📱 Gestión de Leads

### Funcionalidades

1. **Lista de Leads**
   - Visualización de todos los leads
   - Filtrado por Client ID
   - Eliminación de leads
   - Información completa de cada lead

2. **Estadísticas**
   - Total de leads
   - Leads con/sin cliente
   - Leads con teléfono
   - Leads con email

3. **Formulario**
   - Crear nuevos leads
   - Editar leads existentes
   - Campos: nombre, teléfono, email, proyecto, ciudad, data1-5

### Endpoints de la API

La aplicación espera los siguientes endpoints:

```
GET    {API_URL}/facebook-leads          # Listar leads
GET    {API_URL}/facebook-leads/:id      # Obtener un lead
POST   {API_URL}/facebook-leads          # Crear lead
PATCH  {API_URL}/facebook-leads/:id      # Actualizar lead
DELETE {API_URL}/facebook-leads/:id      # Eliminar lead
GET    {API_URL}/facebook-leads/stats    # Estadísticas
```

Todos los endpoints requieren autenticación mediante Bearer Token (Firebase ID Token).

## 🔗 Integración con Zapier

Para recibir leads desde Zapier, configura un webhook:

1. **URL del Webhook:**
   ```
   POST {API_URL}/facebook-leads
   ```

2. **Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer {token}
   ```

3. **Body (ejemplo):**
   ```json
   {
     "clientId": 123,
     "name": "Juan Pérez",
     "phoneManual": "+5491123456789",
     "phoneAuto": "+5491123456789",
     "project": "Casa en La Plata",
     "city": "La Plata",
     "email": "juan@example.com",
     "data1": "Información adicional 1",
     "data2": "Información adicional 2",
     "data3": "Información adicional 3",
     "data4": "Información adicional 4",
     "data5": "Información adicional 5"
   }
   ```

## 🛠️ Tecnologías Utilizadas

- **React Native** - Framework multiplataforma
- **Expo** - Herramientas y servicios
- **Expo Router** - Navegación basada en archivos
- **TypeScript** - Tipado estático
- **Firebase Authentication** - Autenticación de usuarios
- **Axios** - Cliente HTTP con interceptores
- **AsyncStorage** - Almacenamiento local (opcional)

## 📦 Scripts Disponibles

- `pnpm start` - Inicia el servidor de desarrollo
- `pnpm run web` - Ejecuta en navegador web
- `pnpm run ios` - Ejecuta en iOS (requiere macOS)
- `pnpm run android` - Ejecuta en Android

## 🚢 Build para Producción

### Web
```bash
pnpm run web
# Luego usar el build generado en web-build/
```

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## 📝 Notas

- El proyecto está configurado para usar Expo Router (navegación basada en archivos)
- Las variables de entorno deben usar el prefijo `EXPO_PUBLIC_` para estar disponibles en el cliente
- El token de autenticación se guarda automáticamente y se incluye en todas las peticiones
- La aplicación redirige automáticamente según el estado de autenticación

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y de uso interno.

---

Desarrollado con ❤️ para CM La Platas

