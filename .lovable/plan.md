# Plan de evolución de Pieza a Pieza

Esta entrega es grande. La divido en 6 fases para que cada una sea testeable. Te confirmo el plan antes de empezar a construir.

## Resumen de cambios solicitados

1. **Roles de admin/profesor** con 3 cuentas predefinidas y panel de gestión de cursos/contenido.
2. **Renombrar "puntos" → "estrellas"** y añadir reglas de ganancia (videoconf, materiales, quiz).
3. **Ruleta de recompensas** cada 10 estrellas, con materiales configurables por admin.
4. **Videoconferencias BigBlueButton** (enlaces añadidos por admin, asistencia = 1 estrella).
5. **Chatbot Piezin con IA aislado por curso** (uno general + uno por curso, sin fugas de contexto).
6. **Catálogo real de cursos**: Normativa (gratis), Programación/Supuestos/Temas (150 €), bundles 170 €/185 € al mes.
7. **Analítica de usuarios** visible solo para admins (navegación, tiempo, cursos vistos, ruletas, estrellas).
8. **Sección admin en home** para vídeo promocional futuro.
9. **Anuncios redes sociales** (Instagram/TikTok) solo para admins.
10. **UX**: ocultar "Crear cuenta gratis" si el usuario ya está autenticado. Cambiar "Vídeos en YouTube" → "Vídeos y videoconferencias". Piezin se presenta en la home.

---

## Fase 1 — Roles, admin y catálogo real (base)

**Base de datos (migración):**
- Enum `app_role` (`admin`, `student`) + tabla `user_roles` + función `has_role()` (patrón seguro anti-recursión).
- Tabla `course_bundles` (Normativa+2 = 170 €, Normativa+3 = 185 €).
- Añadir `objectives`, `materials_summary`, `duration_hours`, `region` a `courses`.
- Tabla `videoconferences` (course_id, title, scheduled_at, bbb_url, created_by).
- Tabla `vc_attendance` (user_id, vc_id) → otorga estrella.
- Tabla `roulette_items` (admin-editable: tipo `surprise|chest|tutoring`, weight, payload), `roulette_spins`, `roulette_rewards`.
- Renombrar lógico `points` → `stars` (manteniendo columna `points` por compatibilidad o renombrando a `stars`). Migración renombra columna y todas las funciones SQL.
- Tabla `activity_events` (user_id, type, course_id, metadata, created_at, duration_ms) para analítica.
- RLS: admins (vía `has_role`) tienen acceso CRUD a `courses`, `topics`, `units`, `resources`, `videoconferences`, `roulette_items`, lectura completa de `activity_events` y `profiles`.

**Seed:**
- 4 cursos: Normativa (0 €), Programación, Supuestos, Temas (150 € c/u).
- 2 bundles: Normativa+2 → 170 €/mes, Normativa+3 → 185 €/mes.
- 3 cuentas admin (admin1/2/3) con contraseñas dadas, marcadas como `admin` en `user_roles`. Confirmadas por email.

**Frontend:**
- `useUserRole()` hook.
- `RequireAdmin` wrapper.
- Header: si está autenticado, ocultar "Crear cuenta gratis"; si es admin, mostrar enlace "Admin".
- Home: actualizar copy ("Vídeos y videoconferencias"), mostrar 4 cursos como bloques + sección de bundles con precios mensuales.
- Sección admin-only en home: placeholder "Vídeo promocional" editable más adelante.

## Fase 2 — Panel admin (CRUD de contenido)

- Ruta `/_authenticated/admin/cursos` → listar/crear/editar cursos, temas, unidades.
- Editor por unidad: subir/eliminar YouTube ID, recursos (PDF/Word/PPT vía URL), quiz questions.
- Storage bucket `course-files` (privado, RLS por matrícula o admin) para PDFs reales.
- Botón "Añadir videoconferencia" por curso (título + fecha/hora + URL BBB).
- Editor de ruleta: lista de 8 slots configurables (4 sorpresa, 3 cofre con 2 opciones, 1 tutoría individualizada con weight bajo fijo).

## Fase 3 — Sistema de estrellas + ruleta

- Renombrar UI "puntos" → "estrellas" en todos los componentes.
- Server fn `award_star(reason, ref_id)` con dedupe (no dar 2 estrellas por el mismo material/quiz/VC).
- Triggers de estrella: completar unidad (vídeo ≥90%), responder quiz, marcar asistencia VC.
- Detectar `stars % 10 == 0` → habilitar 1 giro de ruleta pendiente.
- Componente `<RouletteModal>` que aparece flotante en el centro al tener giros disponibles, con animación. Backend resuelve el premio con weighted random (tutoría = weight 1 vs sorpresa = 10, cofre = 6).
- `/_authenticated/estrellas` → historial, giros pendientes, recompensas obtenidas, elegir opción en cofre.

## Fase 4 — Chatbot Piezin (aislado por curso)

- Server route `src/routes/api/piezin/$scope.ts` (POST streaming) usando AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview`).
- `scope = "home"` o `scope = "<courseId>"`.
- System prompt construido en servidor:
  - **home**: "Eres Piezin, asistente de Pieza a Pieza. Solo informas sobre los cursos disponibles (precio, objetivos, materiales, duración) y sobre quién eres. NUNCA respondas dudas de contenido de los cursos."
  - **curso X**: "Eres el Piezin del curso {título}. Solo respondes dudas sobre {descripción + objetivos + materiales}. Nunca menciones otros cursos ni compartas contexto. Normativa: Castilla-La Mancha, oposiciones Enseñanzas Medias — Orientación Educativa."
- Cada chat aislado: no se envía historial cruzado entre scopes; el cliente mantiene un thread por `scope` en localStorage.
- Componente `<PiezinChat scope=... />` flotante en home y dentro de cada página de curso.

## Fase 5 — Analítica de admins

- Cliente: hook `useActivityTracker()` envía eventos (`page_view`, `course_click`, `unit_view`, `video_progress`, `quiz_attempt`, `vc_join`, `roulette_spin`) con `duration_ms` al cerrar/cambiar de página.
- Server fn `log_activity` (rate-limited) inserta en `activity_events`.
- Ruta `/_authenticated/admin/analytica` (solo admin): gráficos con Recharts (sesiones por día, top cursos, estrellas ganadas, ruletas giradas, tiempo medio), tabla por usuario.

## Fase 6 — Conexión redes sociales (Instagram + TikTok Ads)

- Solo admin: ruta `/_authenticated/admin/anuncios`.
- TikTok: usar el conector existente vía gateway (`standard_connectors--connect` con `tiktok`).
- Instagram Ads: requiere conector Meta/Facebook (te lo pediré con `standard_connectors--connect` cuando llegue la fase; si no existe, te avisaré para usar API key manual).
- Plantillas de anuncio preconfiguradas con copy de educación/orientación/profesorado en Castilla-La Mancha.
- Esta fase la haremos al final porque depende de que tú confirmes las cuentas a conectar.

---

## Lo que NO incluyo todavía (necesito tu confirmación)

- **Pagos reales** de los cursos (Stripe/Paddle). Por ahora la matriculación será manual o "demo" hasta que actives pagos. Dime si quieres incluir pagos en la Fase 1 o más tarde.
- **Visor real de PPT/Word**: usaremos vista embed de Office Online + descarga; PDF con visor nativo del navegador.
- **BigBlueButton**: solo enlaces (no integración con su API); el admin pega la URL.

## Detalles técnicos (puedes saltar esto)

- Stack: TanStack Start + Lovable Cloud (Supabase) + AI SDK + Recharts + shadcn.
- Renombrado `points → stars`: migración que `ALTER TABLE profiles RENAME COLUMN points TO stars`, actualiza función `add_points` → `add_stars`, regenera tipos.
- RLS admin: `USING (public.has_role(auth.uid(), 'admin'))` en políticas de escritura de tablas de contenido.
- Aislamiento Piezin: el server fn NO acepta system prompt del cliente; lo construye desde el `scope` recibido y consulta solo el curso correspondiente en BBDD.
- Analítica: índice en `(user_id, created_at)` y `(type, created_at)`.

## Pregunta antes de empezar

¿Empiezo por **Fase 1 + Fase 2** (admins, catálogo real con bundles, panel CRUD) en este mismo turno y dejo Piezin/ruleta/analítica/redes para turnos siguientes? Es el camino más limpio para no romper nada y poder probar paso a paso.
