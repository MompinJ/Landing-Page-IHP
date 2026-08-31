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
-- Se pega entero en el editor SQL de Supabase, y CREA una base desde cero. Para
-- CAMBIAR una que ya existe NO SIRVE: `create table if not exists` sobre una
-- tabla que existe no hace nada, restricciones incluidas, así que repegarlo sale
-- «bien» sin cambiar una coma. Un cambio de esquema va con `alter`, siempre.
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
  -- punto se quitó al ver que dejaba pasar «VISITA-XXX.C». No pretende filtrar
  -- groserías —caben, y ninguna expresión regular lo va a evitar—: cierra lo
  -- mecánico, que es emojis, caracteres invisibles y direcciones web.
  --
  -- TREINTA, no doce. Doce daban para el nombre de pila y poco más: «MARIA
  -- FERNANDEZ» son quince, y la tabla le rechazaba la marca a cualquiera que
  -- escribiera nombre y apellido — se quedaba fuera del marcador sin saber por
  -- qué. Y la Ü entra aparte porque estaba fuera del conjunto y se comía la
  -- diéresis de apellidos como AGÜERO.
  constraint pq_nombre_valido check (nombre ~ '^[A-ZÑÁÉÍÓÚÜ0-9][A-ZÑÁÉÍÓÚÜ0-9 -]{0,29}$'),

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

  -- Ver la nota de `pq_nombre_valido`: treinta caracteres y con Ü.
  constraint tr_nombre_valido    check (nombre ~ '^[A-ZÑÁÉÍÓÚÜ0-9][A-ZÑÁÉÍÓÚÜ0-9 -]{0,29}$'),
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
-- RESEÑAS
--
-- De 1 a 5 estrellas y, si a quien juega le apetece, un comentario corto. Lo
-- pide la pantalla final de los dos juegos, en un modal que se abre al acabar
-- —después de firmar la marca, nunca antes: no se le pregunta a nadie qué le
-- pareció mientras todavía está mirando su puntuación.
--
-- SALIÓ DE UNA CARENCIA CONCRETA DEL STAND. La gente decía en voz alta que el
-- juego le había gustado y eso no quedaba en ninguna parte: al desmontar el
-- congreso lo único que había para enseñar era una lista de puntuaciones, que
-- dice cuánta gente jugó pero no qué le pareció a nadie.
--
-- UNA SOLA TABLA PARA LOS DOS JUEGOS, al revés que los marcadores, y no es una
-- incoherencia con lo de arriba: los marcadores son dos competiciones distintas
-- y mezclarlas en una consulta sería un error de verdad; las reseñas son LA
-- MISMA pregunta hecha en dos sitios, y lo que se va a querer al cerrar el
-- congreso es precisamente leerlas juntas y comparar. La columna `juego` separa
-- cuando hace falta, que es cuando cada juego enseña las suyas.
--
-- NOMBRE Y UNIDAD VIAJAN, pero son OPCIONALES y no se piden aparte: se copian
-- de lo que esa misma persona acaba de firmar en el marcador. Volver a pedirlos
-- dentro del modal sería la forma más rápida de que nadie lo rellenara. Son
-- nulables porque la reseña tiene que poder guardarse aunque la firma no haya
-- llegado a la tabla —el wifi del stand— y porque la calificación vale igual
-- sin saber de quién es.
-- ---------------------------------------------------------------------
create table if not exists public.resenas (
  id         bigint generated always as identity primary key,
  creado_en  timestamptz not null default now(),
  juego      text     not null,
  estrellas  smallint not null,
  comentario text,
  nombre     text,
  unidad     text references public.unidades(codigo),

  -- Los dos juegos del stand y nada más. Un juego nuevo entra por `alter`, que
  -- es justo lo que obliga a decidir si sus reseñas pintan algo en esta lista.
  constraint rs_juego_valido check (juego in ('port_quest', 'terminal_rally')),

  constraint rs_estrellas_validas check (estrellas between 1 and 5),

  -- EL COMENTARIO SE PINTA EN LA PANTALLA FINAL, delante de quien está haciendo
  -- cola, así que se le pone la misma clase de cerco que al nombre y por la
  -- misma razón: no pretende filtrar groserías —caben, y ninguna expresión
  -- regular lo va a evitar—, cierra lo mecánico. Fuera quedan los emojis, los
  -- caracteres invisibles y, al no admitir ni `:` ni `/`, las direcciones web,
  -- que es lo que convierte una reseña en un anuncio.
  --
  -- Ciento cuarenta caracteres: da para una frase entera y no para un párrafo
  -- que reviente la tarjeta. Y minúsculas SÍ, al revés que el nombre — el
  -- nombre va en versales porque es una tabla de marcador; un comentario en
  -- mayúsculas se lee como un grito.
  constraint rs_comentario_valido check (
    comentario is null
    or (length(btrim(comentario)) > 0
        and comentario ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,;!¡¿?''"()-]{1,140}$')
  ),

  -- Ver la nota de `pq_nombre_valido`: es el mismo nombre que firmó el marcador
  -- y tiene que pasar exactamente el mismo filtro, o la reseña se guardaría con
  -- un nombre que la tabla de al lado habría rechazado.
  constraint rs_nombre_valido check (
    nombre is null or nombre ~ '^[A-ZÑÁÉÍÓÚÜ0-9][A-ZÑÁÉÍÓÚÜ0-9 -]{0,29}$'
  )
);

-- Se leen SIEMPRE por juego y SIEMPRE por lo más reciente primero: las últimas
-- reseñas son las que hablan de la versión que está corriendo ahora mismo.
create index if not exists rs_recientes on public.resenas (juego, creado_en desc);


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

-- Las reseñas comparten techo con los marcadores: no puede haber más reseñas
-- por minuto que partidas, porque cada reseña sale de una partida terminada.
create or replace function private.rs_ritmo_ok() returns boolean
  language sql security invoker stable set search_path = public as $$
    select count(*) < 60 from public.resenas
    where creado_en > now() - interval '1 minute';
$$;

grant execute on function private.pq_ritmo_ok() to anon, authenticated;
grant execute on function private.tr_ritmo_ok() to anon, authenticated;
grant execute on function private.rs_ritmo_ok() to anon, authenticated;


-- ---------------------------------------------------------------------
-- RLS
--
-- LEER, INSERTAR y BORRAR. No hay política de UPDATE, y en RLS lo que no tiene
-- política está prohibido: nadie puede editar la marca de otro.
--
-- EL BORRADO ES UNA PUERTA ABIERTA A CONCIENCIA, no un descuido, y es lo único
-- de este esquema sin vuelta atrás durante el evento. Lo pide la pantalla
-- `/marcador`, que es la que se proyecta en el stand y desde la que se limpian
-- las tablas entre jornadas.
--
-- Esa pantalla pide una contraseña antes de enseñar los botones, pero la
-- contraseña vive en el JavaScript del sitio: es una tapa contra lo ACCIDENTAL
-- —que alguien se tope con la URL y pulse por curiosidad—, no una cerradura.
-- Cualquiera con la clave publishable, que va a la vista, puede vaciar las dos
-- tablas desde la consola del navegador.
--
-- Una fila falsa se quita en diez segundos desde el panel; un borrado sin
-- `where` a media jornada se lleva las marcas de todo el mundo y no hay de
-- dónde recuperarlas. Mientras la puerta esté abierta, conviene un respaldo
-- periódico de las dos tablas durante el congreso.
-- ---------------------------------------------------------------------
alter table public.unidades              enable row level security;
alter table public.port_quest_scores     enable row level security;
alter table public.terminal_rally_scores enable row level security;
alter table public.resenas               enable row level security;

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

-- El borrado que pide `/marcador` (ver la nota larga de arriba)
drop policy if exists pq_borrar on public.port_quest_scores;
create policy pq_borrar on public.port_quest_scores
  for delete to anon, authenticated using (true);

drop policy if exists tr_borrar on public.terminal_rally_scores;
create policy tr_borrar on public.terminal_rally_scores
  for delete to anon, authenticated using (true);

drop policy if exists rs_leer on public.resenas;
create policy rs_leer on public.resenas
  for select to anon, authenticated using (true);

drop policy if exists rs_insertar on public.resenas;
create policy rs_insertar on public.resenas
  for insert to anon, authenticated with check (private.rs_ritmo_ok());

-- El borrado de una reseña es lo mismo que el de una marca, pero por un motivo
-- más probable: aquí lo que se guarda es TEXTO LIBRE y se pinta en la pantalla
-- final delante de la cola. Si alguien escribe algo que no puede quedarse ahí,
-- tiene que poder quitarse en el acto desde el panel de Supabase, sin esperar a
-- una migración ni a que termine la jornada.
drop policy if exists rs_borrar on public.resenas;
create policy rs_borrar on public.resenas
  for delete to anon, authenticated using (true);


-- ---------------------------------------------------------------------
-- PERMISOS EXPLÍCITOS
--
-- Hacen falta porque al crear el proyecto se desmarcó «Automatically expose new
-- tables»: las tablas nuevas ya no se publican solas, que es lo que se quería.
-- El precio es decir aquí, a mano, qué se publica.
--
-- ESTOS `grant` NO RESTAN NADA, Y ESO ES UNA SORPRESA QUE CONVIENE NO OLVIDAR.
-- Aquí decía que «no se concede UPDATE: aunque mañana alguien añadiera una
-- política por despiste, sin el GRANT no habría por dónde», y es FALSO —
-- comprobado contra la base el 2026-08-31, las cuatro tablas tienen concedido a
-- `anon` y `authenticated` DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
-- TRUNCATE y UPDATE. El motivo es que el esquema `public` trae unos DEFAULT
-- PRIVILEGES que conceden ALL en cada tabla nueva, y un `grant` de tres verbos
-- encima de un ALL que ya está puesto no quita los otros cuatro. La casilla que
-- se desmarcó controla otra cosa (que PostgREST publique la tabla), no esto.
--
-- QUÉ SIGNIFICA EN LA PRÁCTICA: ningún agujero abierto hoy. RLS tapa el UPDATE
-- —no hay política de UPDATE en ninguna tabla, y lo que no tiene política está
-- prohibido— y PostgREST no expone TRUNCATE. Lo que NO existe es la segunda
-- línea de defensa que este párrafo prometía: si mañana alguien añade una
-- política de UPDATE por despiste, el GRANT ya está puesto y no frena nada.
--
-- En `resenas` sí se cerró, con el `revoke` de abajo. En las dos tablas de
-- marcadores NO se ha tocado: están en producción con las marcas del congreso
-- dentro y no es algo que se cambie a media jornada por una mejora que hoy no
-- arregla ningún fallo. Pendiente para cuando el stand cierre.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select                 on public.unidades              to anon, authenticated;
grant select, insert, delete on public.port_quest_scores     to anon, authenticated;
grant select, insert, delete on public.terminal_rally_scores to anon, authenticated;
grant select, insert, delete on public.resenas               to anon, authenticated;

-- Y lo que de verdad deja a `resenas` con los tres verbos y nada más (ver la
-- nota de arriba: sin esto, los DEFAULT PRIVILEGES le habían dado ALL).
revoke update, truncate, references, trigger on public.resenas from anon, authenticated;

-- `rls_auto_enable()` la crea Supabase al marcar «Enable automatic RLS»: la
-- llama un disparador de eventos al crear una tabla. Ningún navegador tiene por
-- qué invocarla, y hay que revocar a PUBLIC — en Postgres el EXECUTE de una
-- función nueva se concede a PUBLIC por omisión, así que quitárselo a un rol
-- concreto no le quita lo que tiene POR SER PUBLIC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
