adb devices
emulator -avd cmlaplata
pnpm start:8089
Puerto de apertura: 8089

Debuggear
En la app del emuladro ctrl+m
chrome://inspect

Cuenta
cmuser4552ik@cmlaplata.com
cmlaplataVqn6

Autorizacion de Facebook lead:
Todo lo que refiere a esta app usa el endpoint fijo

-----

Deep links 
4. Ejemplos de links:
cmlaplatacontractors:// - Abre la app
cmlaplatacontractors://dashboard - Navega al dashboard
cmlaplatacontractors://leads/123 - Abre el lead con ID 123
5. Usar desde fuera de la app:
En un navegador: escribe cmlaplatacontractors://dashboard
En HTML: <a href="cmlaplatacontractors://dashboard">Abrir app</a>
En un email/SMS: incluye el link y al hacer clic abrirá la app
Nota: Después de cambiar el scheme, reconstruye la app nativa (npx expo run:android o npx expo run:ios).
Ya agregué una función de ejemplo handleCopyLeadLink en FacebookLeadsList.tsx que puedes usar como referencia.