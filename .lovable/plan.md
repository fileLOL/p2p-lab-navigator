# Entrar con Google y cuota que no se puede reiniciar borrando la cuenta

Dos cambios: añadir el acceso con Google y hacer que la cuota diaria de búsquedas quede ligada al correo, no a la cuenta.

## 1. Entrar con Google

- Botón "Continuar con Google" en la pantalla de acceso, junto al formulario de correo y contraseña, tanto en "Entrar" como en "Crear cuenta".
- Al volver de Google se entra directo al panel; si el usuario venía de una página privada, vuelve a ella.
- Quien entre por primera vez con Google recibe su perfil y sus 20 € virtuales igual que ahora.
- Se activa el proveedor de Google en el backend en el mismo cambio, para que funcione desde el primer intento.

## 2. La cuota no se reinicia al borrar y volver a crear la cuenta

Hoy el contador diario cuelga de la cuenta, así que al borrarla desaparece. Pasará a colgar del correo:

- El consumo diario se guarda además en un registro por correo (guardado cifrado, no en texto claro) que sobrevive al borrado de la cuenta.
- Al buscar, se cuenta contra ese registro: si el correo ya gastó sus 5 búsquedas hoy, una cuenta nueva con el mismo correo empieza en 0 restantes, con el mismo aviso de Premium.
- Al día siguiente (hora UTC) vuelve a contar desde cero, como ahora.
- Borrar la cuenta sigue eliminando todo lo demás: perfil, cartera, posiciones, operaciones e historial. Solo se conserva el contador del día por correo.
- En la pantalla de borrado se avisa de que el consumo del día no se reinicia al volver a registrarse.
- Google y correo comparten el mismo contador cuando el correo es el mismo.

## Detalles técnicos

- Google vía `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` y `supabase--configure_social_auth`; ruta pública de retorno, nunca una ruta protegida.
- Nueva tabla `email_search_usage (email_hash, usage_date, searches)` con clave única, sin RLS de lectura para usuarios (solo funciones `SECURITY DEFINER` y `service_role`). `email_hash` = digest SHA-256 del correo normalizado en minúsculas + sal del servidor.
- `consume_search()` y `get_quota()` pasan a leer y escribir el máximo entre el uso de la cuenta y el uso del correo; `handle_new_user` no toca ese registro.
- `delete_my_account()` conserva la fila de `email_search_usage`; se añade limpieza automática de filas de días anteriores.
- Tests nuevos: cuota agotada → borrar cuenta → registrarse de nuevo con el mismo correo → 0 restantes; día siguiente → 5 restantes.
