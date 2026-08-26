-- =====================================================================
-- MARCADORES DEL CONGRESO — Port Quest y Terminal Rally
--
-- ESTE FICHERO ES EL ESTADO REAL DE LA BASE DE DATOS, volcado de ella y no
-- escrito de memoria: la primera versión se quedó desfasada en tres sitios a
-- las pocas horas (el nombre, el catálogo de unidades y el techo de Terminal
-- Rally) porque se fue corrigiendo por migraciones y nadie lo trajo de vuelta.
-- Si se vuelve a tocar el esquema por el panel o por migración, vuélcalo otra
-- vez en vez de parchear a mano.
--
-- Dos tablas SEPARADAS a propósito, no una con un campo «juego»: son dos
-- marcadores distintos y nadie los va a mezclar por error en una consulta.
--
-- QUÉ PROTEGE ESTO Y QUÉ NO. La clave publishable viaja dentro del JavaScript
-- de un sitio estático: es pública y no hay forma de que no lo sea, o sea que
-- cualquiera puede mandar un INSERT a mano. Lo que hace este fichero es que la
-- base de datos se niegue a guardar un marcador que NO PUEDE HABER OCURRIDO —de
-- eso va el «PEPE 999999»— y que nadie pueda tocar ni borrar lo ya guardado.
--
-- Lo que NO evita: alguien que se moleste en imitar una partida coherente puede
-- colar un registro. Para eso haría falta que el servidor arbitrara la partida.
-- La diferencia práctica es que lo primero lo hace cualquiera en treinta
-- segundos desde la consola del navegador, y lo segundo hay que quererlo hacer.
--
-- Se pega entero en el editor SQL de Supabase. Es idempotente.
-- =====================================================================


-- ---------------------------------------------------------------------
-- CATÁLOGO DE UNIDADES — una sola lista para los dos juegos, y la que leen
-- ambos al abrir para llenar su selector. Es también contra la que valida la
-- clave foránea al guardar: por eso los juegos la LEEN de aquí en vez de traer
-- la suya escrita — un selector desincronizado no da un texto raro, da una
-- marca rechazada.
--
-- Son DOCE. `HPM` estuvo un rato y se quitó: el Grupo usa HPMX y HPML.
-- ---------------------------------------------------------------------
create table if not exists public.unidades (
  codigo text primary key,
  nombre text not null
);

insert into public.unidades (codigo, nombre) values
  ('HPMX',     'Hutchison Ports México'),
  ('HPML',     'Hutchison Ports (corporativo)'),
  ('EIT',      'Ensenada International Terminal'),
  ('ECV',      'Ensenada Cruiseport Village'),
  ('LCT',      'Lázaro Cárdenas Terminal Portuaria de Contenedores'),
  ('LCMT',     'Lázaro Cárdenas Multipurpose Terminal'),
  ('TIMSA',    'Terminal Internacional de Manzanillo'),
  ('ICAVE',    'Internacional de Contenedores Asociados de Veracruz'),
  ('TNG',      'Talleres Navales del Golfo'),
  ('TILH',     'Terminal Intermodal Logística de Hidalgo'),
  ('CCI',      'CCI'),
  ('INVITADO', 'Invitado o empresa externa')
on conflict (codigo) do nothing;


-- ---------------------------------------------------------------------
-- PORT QUEST
--
-- Los topes NO son números redondos elegidos a ojo: salen de `data/balance.ts`.
--
--   SCORE_GOOD 10, y el combo máximo es x3   → 30 por tarjeta
--   SCORE_ROW 10 cada SCORE_ROW_EVERY 10     → 1 por fila de avance
--   SCORE_STAMP 50 × 5 terminales por vuelta → 250 por vuelta
--   SCORE_PASSPORT_COMPLETE 300 por vuelta   → 300 por vuelta
--   ZONE_LENGTH 13 × 5 terminales            → 65 filas por vuelta
--
-- El invariante fuerte es que SOLO SE PISA UNA CASILLA POR FILA, así que no se
-- pueden recoger más tarjetas que filas cruzadas. Dando por buenas dos tarjetas
-- por fila (las bandas pueden arrastrarte sobre una extra) y todas al
-- multiplicador máximo, el techo por fila es 2×30 + 1 + (550/65) ≈ 70. Es unas
-- cuatro veces una partida excelente: quiere ser IMPOSIBLE de superar jugando.
-- ---------------------------------------------------------------------
create table if not exists public.port_quest_scores (
  id            bigint generated always as identity primary key,
  creado_en     timestamptz not null default now(),
  nombre        text    not null,
  unidad        text    not null references public.unidades(codigo),
  puntos        integer not null,
  fila_maxima   integer not null,
  duracion_ms   integer not null,
  precision_pct smallint,
  terminales    text[]  not null default '{}',

  -- Empieza por letra o número, y solo letras, dígitos, espacio y guion. El
  -- punto se quitó al ver que dejaba pasar «VISITA-XXX.C» en doce caracteres.
  -- No pretende filtrar groserías: en doce caracteres caben y ninguna expresión
  -- regular lo va a evitar. Cierra lo mecánico — emojis, caracteres invisibles
  -- y direcciones web—, que es lo que se pone solo.
  constraint pq_nombre_valido check (nombre ~ '^[A-ZÑÁÉÍÓÚ0-9][A-ZÑÁÉÍÓÚ0-9 -]{0,11}$'),

  -- EL TECHO: más puntos que filas cruzadas es imposible (ver arriba).
  constraint pq_puntos_posibles check (puntos <= 70 * fila_maxima + 500),

  -- Y EL SUELO, que es el techo con el signo cambiado. LOS DOS JUEGOS PUEDEN
  -- ACABAR EN NEGATIVO y lo di por imposible: aquí se resta SCORE_BAD 10 por
  -- ficha roja y no hay suelo en el juego. Con un `puntos >= 0` la base de
  -- datos rechazaba justo a quien peor le fue — que en un stand es el que se
  -- acerca por primera vez, no entiende los controles y choca tres veces, o sea
  -- a quien más le importa ver su nombre en la tabla. Se cazó en el registro de
  -- Postgres: «violates check constraint "tr_puntos_min"».
  --
  -- No es simetría bonita: la MAGNITUD de una puntuación está acotada por lo
  -- que la partida pudo generar, y eso vale en las dos direcciones. Sigue
  -- siendo imposible mandar un -999999 con tres filas.
  constraint pq_puntos_posibles_min check (puntos >= -(70 * fila_maxima + 500)),

  constraint pq_fila_sana check (fila_maxima >= 0 and fila_maxima <= 100000),

  -- EL SUELO DE TIEMPO: cada salto son STEP_TIME 0.2 s. 150 ms por fila deja
  -- holgura para la cola de entrada y sigue matando al que envía sin jugar.
  constraint pq_tiempo_posible check (duracion_ms >= 150 * fila_maxima),
  constraint pq_duracion_sana  check (duracion_ms >= 0 and duracion_ms <= 7200000),
  constraint pq_precision_sana check (precision_pct is null or (precision_pct >= 0 and precision_pct <= 100))
);

create index if not exists pq_top on public.port_quest_scores (puntos desc, creado_en asc);


-- ---------------------------------------------------------------------
-- TERMINAL RALLY
--
-- Sus constantes (`src/constants.js`): +10 por acierto, −10 por fallo,
-- OBSTACLE_PENALTY 15, GAME_DURATION 120 s y velocidad de BASE_SPEED 13 a
-- MAX_SPEED 26 unidades por segundo.
--
-- EL TECHO SE CALIBRÓ CORRIENDO, no a ojo, y el primer valor que puse (5) era
-- treinta veces de más. Medido en carrera real: entre 0.07 y 0.16 puntos por
-- metro. Y el techo teórico de una carrera PERFECTA sale de cruzar dos cosas: a
-- la velocidad observada (~15.5 m/s) los 120 s dan unos 1860 m, y recoger TODOS
-- los hexágonos buenos a +10 anda por los 2000 puntos → ~1.07 puntos/metro.
-- Queda en 2, el doble de esa carrera perfecta.
-- ---------------------------------------------------------------------
create table if not exists public.terminal_rally_scores (
  id          bigint generated always as identity primary key,
  creado_en   timestamptz not null default now(),
  nombre      text    not null,
  unidad      text    not null references public.unidades(codigo),
  puntos      integer not null,
  distancia   integer not null,
  duracion_ms integer not null,

  constraint tr_nombre_valido    check (nombre ~ '^[A-ZÑÁÉÍÓÚ0-9][A-ZÑÁÉÍÓÚ0-9 -]{0,11}$'),
  constraint tr_puntos_posibles  check (puntos <= 2 * distancia + 500),
  -- Ver la nota larga en `pq_puntos_posibles_min`: aquí se resta 10 por riesgo
  -- y 15 por choque, así que una carrera mala termina bajo cero.
  constraint tr_puntos_posibles_min check (puntos >= -(2 * distancia + 500)),
  constraint tr_distancia_sana   check (distancia >= 0 and distancia <= 1000000),
  -- A MAX_SPEED 26 u/s, recorrer N unidades no baja de N/26 s. Se usa 30 por
  -- unidad en vez de 38 para dejar margen a la medición del cliente.
  constraint tr_tiempo_posible   check (duracion_ms >= 30 * distancia),
  constraint tr_duracion_sana    check (duracion_ms >= 0 and duracion_ms <= 7200000)
);

create index if not exists tr_top on public.terminal_rally_scores (puntos desc, creado_en asc);


-- ---------------------------------------------------------------------
-- FRENO DE CAUDAL
--
-- Un tramposo con paciencia puede fabricar UN registro coherente; lo que no
-- debería poder es dejar un script metiendo mil. Sesenta por minuto y tabla es
-- mucho más de lo que da un stand entero —una partida dura minutos— y muchísimo
-- menos de lo que da un bucle. Es un freno GLOBAL, no por persona: sin servidor
-- no hay forma de identificar a nadie.
--
-- VIVEN EN UN ESQUEMA `private` QUE POSTGREST NO PUBLICA. En `public` quedaban
-- expuestas como `/rest/v1/rpc/...` y el auditor de Supabase lo marcaba: no
-- filtran gran cosa, pero es superficie de API que no pinta nada ahí. El rol
-- `anon` conserva USAGE y EXECUTE porque las expresiones de una política corren
-- con los permisos de quien consulta — sin eso, el INSERT del juego fallaría.
-- Y son SECURITY INVOKER, no DEFINER: la política de lectura ya deja a `anon`
-- contar las filas, así que no hace falta más privilegio.
-- ---------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.pq_ritmo_ok() returns boolean
  language sql security invoker stable set search_path = public as $$
    select count(*) < 60 from public.port_quest_scores
    where creado_en > now() - interval '1 minute';
$$;

create or replace function private.tr_ritmo_ok() returns boolean
  language sql security invoker stable set search_path = public as $$
    select count(*) < 60 from public.terminal_rally_scores
    where creado_en > now() - interval '1 minute';
$$;

grant execute on function private.pq_ritmo_ok() to anon, authenticated;
grant execute on function private.tr_ritmo_ok() to anon, authenticated;


-- ---------------------------------------------------------------------
-- RLS — LO QUE DE VERDAD CIERRA LA PUERTA
--
-- Dos verbos y solo dos: leer e insertar. No hay política de UPDATE ni de
-- DELETE, y en RLS lo que no tiene política está PROHIBIDO. Nadie puede editar
-- el marcador de otro ni vaciar la tabla a media jornada, que es el daño que de
-- verdad no tendría arreglo durante el congreso.
-- ---------------------------------------------------------------------
alter table public.unidades              enable row level security;
alter table public.port_quest_scores     enable row level security;
alter table public.terminal_rally_scores enable row level security;

drop policy if exists unidades_leer on public.unidades;
create policy unidades_leer on public.unidades
  for select to anon, authenticated using (true);

drop policy if exists pq_leer on public.port_quest_scores;
create policy pq_leer on public.port_quest_scores
  for select to anon, authenticated using (true);

drop policy if exists pq_insertar on public.port_quest_scores;
create policy pq_insertar on public.port_quest_scores
  for insert to anon, authenticated with check (private.pq_ritmo_ok());

drop policy if exists tr_leer on public.terminal_rally_scores;
create policy tr_leer on public.terminal_rally_scores
  for select to anon, authenticated using (true);

drop policy if exists tr_insertar on public.terminal_rally_scores;
create policy tr_insertar on public.terminal_rally_scores
  for insert to anon, authenticated with check (private.tr_ritmo_ok());


-- ---------------------------------------------------------------------
-- PERMISOS EXPLÍCITOS
--
-- Hacen falta porque al crear el proyecto se desmarcó «Automatically expose new
-- tables»: las tablas nuevas ya no se publican solas, que es lo que se quería.
-- El precio es decir aquí, a mano, qué se publica. NO se concede update ni
-- delete: aunque mañana alguien añadiera una política por despiste, sin el
-- GRANT no habría por dónde.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select         on public.unidades              to anon, authenticated;
grant select, insert on public.port_quest_scores     to anon, authenticated;
grant select, insert on public.terminal_rally_scores to anon, authenticated;

-- `rls_auto_enable()` la crea Supabase al marcar «Enable automatic RLS»: la
-- llama un disparador de eventos al crear una tabla. Ningún navegador tiene por
-- qué invocarla, y hay que revocar a PUBLIC — en Postgres el EXECUTE de una
-- función nueva se concede a PUBLIC por omisión, así que quitárselo a un rol
-- concreto no le quita lo que tiene POR SER PUBLIC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
