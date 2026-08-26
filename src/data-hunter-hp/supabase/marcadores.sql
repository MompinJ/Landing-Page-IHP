-- =====================================================================
-- MARCADORES DEL CONGRESO — Port Quest y Terminal Rally
--
-- Dos tablas SEPARADAS a propósito, no una con un campo «juego»: son dos
-- marcadores distintos y nadie los va a mezclar por error en una consulta.
--
-- QUÉ PROTEGE ESTO Y QUÉ NO. La clave anónima viaja dentro del JavaScript de
-- un sitio estático: es pública y no hay forma de que no lo sea. O sea que
-- cualquiera puede mandar un INSERT a mano. Lo que hace este fichero es que la
-- base de datos se niegue a guardar un marcador que NO PUEDE HABER OCURRIDO —
-- que es de lo que va el «PEPE 999999»— y que nadie pueda tocar ni borrar lo
-- que ya está guardado.
--
-- Lo que NO evita: alguien que se moleste en imitar una partida coherente
-- (puntos plausibles para las filas y el tiempo que declara) puede colar un
-- registro. Para eso haría falta que el servidor arbitrara la partida, y eso
-- ya es otro juego. La diferencia práctica es que lo primero lo hace cualquiera
-- en treinta segundos desde la consola del navegador, y lo segundo hay que
-- quererlo hacer.
--
-- Se pega entero en el editor SQL de Supabase. Es idempotente: se puede volver
-- a ejecutar sin romper nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- CATÁLOGO DE UNIDADES — una sola lista para los dos juegos.
--
-- OJO, HAY UNA DISCREPANCIA QUE HAY QUE RESOLVER: hoy los dos juegos no
-- ofrecen las mismas unidades. Terminal Rally tiene HPMX y HPML (dos) donde
-- Port Quest tiene HPM (una), y Port Quest tiene INVITADO donde Terminal Rally
-- no tiene nada. Aquí va la UNIÓN para que ninguna partida existente se caiga,
-- pero conviene decidir cuál es la lista buena antes del congreso: si no, el
-- mismo colaborador aparece bajo dos siglas según el juego al que se acerque.
-- ---------------------------------------------------------------------
create table if not exists public.unidades (
  codigo text primary key,
  nombre text not null
);

insert into public.unidades (codigo, nombre) values
  ('HPM',      'Corporativo Hutchison Ports México'),
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
-- por fila (las bandas transportadoras pueden arrastrarte sobre una extra) y
-- todas al multiplicador máximo, el techo por fila es 2×30 + 1 + (550/65) ≈ 70.
-- Es unas cuatro veces lo que da una partida excelente de verdad: quiere ser
-- IMPOSIBLE de superar jugando, no ajustado.
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

  -- Sin emojis, sin anuncios y sin insultos en el marcador de un congreso
  constraint pq_nombre_valido  check (nombre ~ '^[A-ZÑÁÉÍÓÚ0-9 .-]{1,12}$'),
  constraint pq_puntos_min     check (puntos >= 0),
  constraint pq_fila_sana      check (fila_maxima between 0 and 100000),
  -- EL TECHO: más puntos que filas cruzadas es imposible (ver arriba)
  constraint pq_puntos_posibles check (puntos <= 70 * fila_maxima + 500),
  -- EL SUELO DE TIEMPO: cada salto son STEP_TIME 0.2 s. 150 ms por fila deja
  -- holgura para la cola de entrada y sigue matando al que envía sin jugar.
  constraint pq_tiempo_posible check (duracion_ms >= 150 * fila_maxima),
  constraint pq_duracion_sana  check (duracion_ms between 0 and 7200000),
  constraint pq_precision_sana check (precision_pct is null or precision_pct between 0 and 100)
);

create index if not exists pq_top on public.port_quest_scores (puntos desc, creado_en asc);


-- ---------------------------------------------------------------------
-- TERMINAL RALLY
--
-- Mismo criterio con sus constantes (`src/constants.js`): +10 por acierto,
-- −10 por fallo, OBSTACLE_PENALTY 15, y la velocidad va de BASE_SPEED 13 a
-- MAX_SPEED 26 unidades por segundo.
--
-- AVISO: el techo de puntos por distancia es una PRIMERA APROXIMACIÓN. En Port
-- Quest la densidad de tarjetas la fija el propio tablero (una casilla por
-- fila); aquí depende de cómo se siembre la pista y eso no lo he medido. Está
-- puesto generoso a propósito. Tras el primer día de pruebas conviene mirar
--
--     select max(puntos::numeric / nullif(distancia, 0)) from terminal_rally_scores;
--
-- y apretar el 5 hasta un par de veces ese valor.
-- ---------------------------------------------------------------------
create table if not exists public.terminal_rally_scores (
  id          bigint generated always as identity primary key,
  creado_en   timestamptz not null default now(),
  nombre      text    not null,
  unidad      text    not null references public.unidades(codigo),
  puntos      integer not null,
  distancia   integer not null,
  duracion_ms integer not null,

  constraint tr_nombre_valido   check (nombre ~ '^[A-ZÑÁÉÍÓÚ0-9 .-]{1,12}$'),
  constraint tr_puntos_min      check (puntos >= 0),
  constraint tr_distancia_sana  check (distancia between 0 and 1000000),
  constraint tr_puntos_posibles check (puntos <= 5 * distancia + 500),
  -- A MAX_SPEED 26 u/s, recorrer N unidades no baja de N/26 segundos. Se usa 30
  -- por unidad en vez de 38 para dejar margen a la medición del cliente.
  constraint tr_tiempo_posible  check (duracion_ms >= 30 * distancia),
  constraint tr_duracion_sana   check (duracion_ms between 0 and 7200000)
);

create index if not exists tr_top on public.terminal_rally_scores (puntos desc, creado_en asc);


-- ---------------------------------------------------------------------
-- FRENO DE CAUDAL
--
-- Un tramposo con paciencia puede fabricar UN registro coherente; lo que no
-- debería poder es dejar un script metiendo mil. Sesenta por minuto y tabla es
-- mucho más de lo que puede generar un stand entero —una partida dura minutos—
-- y muchísimo menos de lo que genera un bucle.
--
-- Es un freno GLOBAL, no por persona: no hay forma de identificar a nadie sin
-- servidor. O sea que alguien empeñado puede molestar a los demás durante un
-- minuto. Es el precio de no montar backend, y se nota en el panel enseguida.
-- ---------------------------------------------------------------------
create or replace function public.pq_ritmo_ok() returns boolean
  language sql security definer stable set search_path = public as $$
    select count(*) < 60 from public.port_quest_scores
    where creado_en > now() - interval '1 minute';
$$;

create or replace function public.tr_ritmo_ok() returns boolean
  language sql security definer stable set search_path = public as $$
    select count(*) < 60 from public.terminal_rally_scores
    where creado_en > now() - interval '1 minute';
$$;


-- ---------------------------------------------------------------------
-- RLS — LO QUE DE VERDAD CIERRA LA PUERTA
--
-- Se conceden DOS verbos y solo dos: leer e insertar. No hay política de UPDATE
-- ni de DELETE, y en RLS lo que no tiene política está PROHIBIDO. Nadie puede
-- editar el marcador de otro ni vaciar la tabla a media jornada, que es el daño
-- que de verdad no tendría arreglo durante el congreso.
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
  for insert to anon, authenticated with check (public.pq_ritmo_ok());

drop policy if exists tr_leer on public.terminal_rally_scores;
create policy tr_leer on public.terminal_rally_scores
  for select to anon, authenticated using (true);

drop policy if exists tr_insertar on public.terminal_rally_scores;
create policy tr_insertar on public.terminal_rally_scores
  for insert to anon, authenticated with check (public.tr_ritmo_ok());


-- ---------------------------------------------------------------------
-- PERMISOS EXPLÍCITOS
--
-- Hacen falta porque al crear el proyecto se desmarcó «Automatically expose new
-- tables»: las tablas nuevas ya no se publican solas, y eso es lo que se quería
-- —el día que añadas una tabla con datos que no deban salir, no sale sola—.
-- El precio es tener que decir aquí, a mano, qué se publica.
--
-- Nótese que NO se concede update ni delete. Aunque mañana alguien añadiera una
-- política por despiste, sin el GRANT no habría por dónde.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select                 on public.unidades              to anon, authenticated;
grant select, insert         on public.port_quest_scores     to anon, authenticated;
grant select, insert         on public.terminal_rally_scores to anon, authenticated;
