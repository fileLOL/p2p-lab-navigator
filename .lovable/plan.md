# Quitar la marca de agua de Lovable

## Qué se hará

Ocultar el distintivo "Edit with Lovable" que aparece superpuesto en las versiones publicadas de la app. Es un ajuste del proyecto, no un cambio de código: al activarlo, la marca deja de mostrarse tanto en el sitio publicado como en la vista previa compartible.

Tu plan actual lo permite (plan Pro activo), así que puede hacerse ahora mismo.

## Estado comprobado

- El distintivo está visible hoy (ajuste de visibilidad: mostrar).
- Revisé el código de la interfaz: no hay ningún otro texto o logo de Lovable visible para el usuario. Las únicas menciones internas son de telemetría de errores y del inicio de sesión con Google, que no se ven en pantalla y no conviene tocar.

## Detalles técnicos

- Ajuste de proyecto: ocultar el distintivo de "Edit with Lovable" en despliegues publicados.
- No se modifica ningún archivo de la app ni se reinstala nada.
- Reversible: se puede volver a mostrar con el mismo ajuste.
