// Contenido de la presentacion de cierre (Unidad 5).
// Fuente: "Cierre SAP S4HANA.pdf" y 12_Unidad_5_Cierre/u5_datos.js.
// Criterio: mostrar solo lo que el equipo puede defender, en lenguaje de negocio.

export const equipo = [
  "Genesis Mariana Aguilar Teran",
  "Maximiliano Dector Valles",
  "Jorge Alberto Mompin Gonzalez",
  "Gibran de Jesus Razo Toledo",
];
export const materia = "Evaluación y gestión de proyectos tecnológicos";
export const uni = "Universidad Cristóbal Colón · Veracruz, Ver.";

export const secciones = [
  { num: "01", name: "Contexto y planeación", sub: "Plataforma, alcance, acta, olas y cronograma" },
  { num: "02", name: "Costos y decisiones", sub: "Presupuesto y viabilidad" },
  { num: "03", name: "Resultados y riesgos", sub: "Antes y después, riesgos gestionados" },
  { num: "04", name: "Cierre formal", sub: "Cierre, aprobación y lecciones aprendidas" },
  { num: "05", name: "Valor y reflexión", sub: "Lo que gana la compañía y lo que aprendimos" },
];

export const contexto = [
  { to: 10000, suffix: "+", label: "usuarios", note: "operación continua" },
  { to: 3, label: "continentes", note: "Norteamérica, Sudamérica y Europa" },
  { to: 20, label: "localidades", note: "9 NA, 6 SA y 5 EU" },
  { to: 12, label: "meses", note: "enero a diciembre de 2027" },
];

export const olasCtx = [
  { name: "Norteamérica", ola: "Ola 1", detail: "9 localidades, piloto Guatemala", date: "Ago 2027" },
  { name: "Sudamérica", ola: "Ola 2", detail: "6 localidades", date: "Oct 2027" },
  { name: "Europa", ola: "Ola 3", detail: "5 localidades", date: "Nov 2027" },
];
export const modulos = [
  ["FI/CO", "Finanzas y costos"],
  ["PP", "Producción"],
  ["SD", "Ventas"],
  ["MM", "Compras e inventario"],
  ["HCM", "Nómina y personal"],
];
export const bases = ["Infraestructura en la nube (AWS)", "Red entre las 20 sedes", "Seguridad de la información"];

// Arquitectura en lenguaje simple
export const arquitectura = [
  { capa: "Usuarios", items: [["10,000+ usuarios", "en las 20 localidades, por rol e idioma"]] },
  { capa: "Módulos", items: [["Finanzas", "FI/CO"], ["Producción", "PP"], ["Ventas", "SD"], ["Compras", "MM"], ["Nómina", "HCM"]] },
  { capa: "Conexiones", items: [["Plantas", "sistemas de piso"], ["Clientes y proveedores", "intercambio electrónico"], ["Bancos", "pagos"], ["Facturación electrónica", "por país"]] },
  { capa: "Ambientes", items: [["Desarrollo", ""], ["Pruebas", ""], ["Capacitación", ""], ["Producción", ""], ["Histórico", "sistema anterior en consulta"]] },
  { capa: "Base", items: [["Nube AWS", "infraestructura (equipos 1 y 3)"], ["Seguridad", "accesos por rol, norma ISO 27001"]] },
];

export const carta = {
  fecha: "15 ene 2027",
  que: [
    ["Objetivo", "SAP S/4HANA en las 20 localidades, en 3 olas durante 2027"],
    ["Beneficio esperado", "Cierre contable de 15 a 5 días y menores costos de manufactura"],
    ["Alcance", "Finanzas, producción, ventas, compras y nómina; datos, conexiones y capacitación"],
  ],
  quien: [
    ["Patrocinador", "Dirección General de Meridian Motors Group"],
    ["Director del proyecto", "Jorge Mompin"],
    ["Fin planeado", "17 de diciembre de 2027"],
  ],
  presupuesto: [
    ["Costo estimado", 31.5, "var(--blue-80)"],
    ["Contingencia", 6.3, "var(--blue-50)"],
    ["Reserva", 1.9, "var(--blue-30)"],
  ],
};

const doy = (m, d) => (new Date(Date.UTC(2027, m - 1, d)) - new Date(Date.UTC(2027, 0, 1))) / 86400000;
export const doyOf = doy;
export const olas = [
  { n: 1, name: "Norteamérica", detail: "9 localidades, piloto Guatemala", prep: doy(6, 28), start: doy(8, 2), end: doy(9, 15), startL: "2 ago", endL: "15 sep", color: "var(--blue-60)" },
  { n: 2, name: "Sudamérica", detail: "6 localidades", prep: doy(7, 6), start: doy(10, 4), end: doy(11, 12), startL: "4 oct", endL: "12 nov", color: "var(--blue-70)" },
  { n: 3, name: "Europa", detail: "5 localidades", prep: doy(9, 13), start: doy(11, 1), end: doy(12, 10), startL: "1 nov", endL: "10 dic", color: "var(--blue-90)" },
];
export const fin = doy(12, 17);
export const fases = [
  ["Inicio", 3, doy(1, 29)],
  ["Análisis y diseño", doy(1, 29), doy(3, 23)],
  ["Construcción y pruebas", doy(3, 23), doy(7, 21)],
  ["Arranques por ola", doy(7, 21), doy(12, 17)],
];

// [fase, inicio, fin, responsables, plan, real]
export const gantt = [
  ["Gestión del proyecto y cierre", [1, 4], [12, 17], "Director y PMO", 1.0, 1.0],
  ["Análisis y diseño por módulo", [2, 2], [3, 23], "Líderes funcionales y consultores", 3.0, 3.2],
  ["Construcción y pruebas", [3, 24], [7, 21], "Consultores técnicos y calidad", 15.5, 16.6],
  ["Capacitación y gestión del cambio", [2, 2], [6, 24], "Líder de cambio y capacitadores", 4.0, 3.9],
  ["Ola 1 · Norteamérica", [6, 28], [9, 15], "Equipo de arranque NA", 2.7, 2.9],
  ["Ola 2 · Sudamérica", [7, 6], [11, 12], "Equipo de arranque SA", 2.6, 3.3],
  ["Ola 3 · Europa", [9, 13], [12, 10], "Equipo de arranque EU", 2.7, 3.3],
];

// Investigacion libre: usos de IA como herramienta del equipo (costo en USD)
export const ia = [
  ["Asistente de soporte para usuarios en los arranques", 6000],
  ["Traducción de materiales de capacitación", 5300],
  ["Revisión de calidad de los datos", 4950],
  ["Borradores de documentación y casos de prueba", 4200],
  ["Apoyo en informes y análisis de riesgos", 1225],
];

// Costo real por partida (USD M), en lenguaje simple
export const costoReal = [
  ["Consultoría de implementación", 12.4],
  ["Licencias SAP", 6.5],
  ["Capacitación y gestión del cambio", 3.9],
  ["Migración de datos", 3.1],
  ["Conexiones con otros sistemas", 2.3],
  ["Pruebas y calidad", 2.0],
  ["Soporte en los arranques", 1.7],
  ["Requisitos fiscales por país", 1.3],
  ["Dirección y seguridad", 1.0],
];

export const viabilidad = {
  alternativas: ["A. Nube pública", "B. RISE with SAP", "C. Licencia propia en AWS"],
  criterios: [
    ["Ajuste a procesos automotrices", 25, [2, 5, 5]],
    ["Operación en 3 continentes", 15, [4, 4, 4]],
    ["Riesgo de implementación", 15, [4, 3, 3]],
    ["Costo total", 15, [4, 3, 3]],
    ["Control sobre cambios", 10, [1, 4, 5]],
    ["Nivel de servicio", 10, [3, 4, 3]],
    ["Velocidad de despliegue", 10, [4, 3, 3]],
  ],
  total: [3.1, 3.85, 3.85],
};

export const metricas = [
  { k: "Cierre contable", u: "días", a: 15, d: 5, meta: "Meta: 5 días" },
  { k: "Respuesta logística", u: "días del pedido a la entrega", a: 5, d: 2, meta: "Meta: 2 días" },
  { k: "Visibilidad de inventario", u: "horas de retraso", a: 48, d: 0, dLabel: "Tiempo real", meta: "Meta: tiempo real" },
  { k: "Exactitud de inventario", u: "%", a: 90, d: 98.2, dec: 1, meta: "Meta: 98%" },
  { k: "Entregas a tiempo", u: "%", a: 85, d: 95.4, dec: 1, meta: "Meta: 95%" },
  { k: "Adopción de usuarios", u: "% de usuarios activos", a: 0, aLabel: "Nuevo", d: 92, meta: "Meta: 90%" },
];

export const riesgos = {
  r1: {
    code: "R1",
    name: "Calidad de los datos",
    p: 4,
    i: 5,
    paso: [
      "La primera carga de prueba de Sudamérica superó el margen de errores permitido",
      "Se hicieron ciclos extra de corrección en Brasil y Alemania",
    ],
    respuesta: [
      "Un responsable de datos en cada localidad",
      "Tres cargas de prueba por ola antes de arrancar",
      "Regla: no se avanza sin datos conciliados",
    ],
    resultado: "Arranque sin errores críticos y sin mover la fecha de la ola",
    stats: [
      ["3", "cargas de prueba por ola"],
      ["20", "responsables de datos"],
      ["0", "errores críticos al arrancar"],
    ],
  },
  r13: {
    code: "R13",
    name: "Disponibilidad de consultores SAP",
    p: 4,
    i: 4,
    paso: [
      "Alta demanda de consultores SAP en el mercado durante 2027",
      "Algunas plazas tardaron más de lo previsto en cubrirse",
    ],
    respuesta: [
      "Contrato marco con reemplazos garantizados",
      "Un segundo proveedor como respaldo",
      "Bono de permanencia por cada arranque cumplido",
    ],
    resultado: "16 de 16 plazas cubiertas y ninguna ola retrasada",
    stats: [
      ["16 / 16", "plazas cubiertas"],
      ["2", "proveedores"],
      ["0", "olas retrasadas"],
    ],
  },
};

export const cierreAdmin = [
  "Entregables verificados y aceptados",
  "Contratos cerrados y pagos finales emitidos",
  "Conciliación del presupuesto: plan contra real",
  "Documentación archivada",
];
export const cierreTec = [
  "Entrega del sistema al equipo de soporte",
  "Sistema anterior en modo consulta",
  "Liberación del equipo con evaluación de desempeño",
  "Reconocimiento al equipo",
];

export const aprobacion = [
  "Documento formal firmado por el patrocinador",
  "Confirma que los entregables cumplen lo acordado",
  "Protege al equipo de cambios fuera del alcance",
];
export const informe = [
  ["Desempeño", "plan contra real"],
  ["Entregables", "aceptados"],
  ["Riesgos", "y respuestas"],
  ["Lecciones", "aprendidas"],
];

export const control = [
  { to: 2.7, decimals: 1, prefix: "USD ", suffix: " M", label: "de contingencia utilizada", note: "de USD 6.3 M disponibles" },
  { text: "17 dic", label: "fecha de cierre cumplida", note: "la planeada desde el inicio" },
  { to: 0, label: "errores de nómina", note: "en los arranques de las tres olas" },
];

export const lecciones = [
  { tema: "Datos", rec: "Revisar y limpiar los datos con anticipación, con un responsable por localidad." },
  { tema: "Talento", rec: "Asegurar a los consultores clave desde el inicio, con reemplazos acordados." },
  { tema: "Coordinación", rec: "Un solo calendario con Infraestructura y Redes, revisado cada semana." },
  { tema: "Capacitación", rec: "Preparar y traducir los materiales desde la etapa de diseño." },
  { tema: "Nómina", rec: "Fijar los arranques de nómina al calendario de pagos desde el plan inicial." },
];

export const transferencia = [
  ["Capacitación", "Por rol e idioma para más de 10,000 usuarios, con usuarios clave que capacitan a sus compañeros."],
  ["Documentación", "Manuales por rol, guías de solución de problemas y procedimientos de operación."],
  ["Acompañamiento", "El equipo del proyecto acompañó cada ola después del arranque hasta su salida formal."],
];
export const resistencia = [
  "Mostrar beneficios concretos: menos trabajo repetitivo",
  "Usuarios clave como embajadores en cada planta",
  "Boletines por ola y respuesta a dudas en 24 horas",
];

export const valor = [
  { big: "20 → 1", sub: "20 localidades con procesos distintos, ahora una sola operación" },
  { big: "Best Practices", sub: "Procesos probados de SAP adoptados en lugar de personalizar" },
  { big: "USD 79 M", sub: "ahorro anual esperado a régimen", accent: true },
  { big: "Plantilla", sub: "global y repetible para crecer a nuevos países" },
];

export const reflexionCompania = [
  "20 localidades con procesos separados convertidas en una sola operación: decidir ya no espera 15 días de cierre.",
  "El valor no está solo en el software, sino en adoptar las mejores prácticas de SAP en lugar de personalizar.",
  "Queda una plantilla global, un equipo de soporte formado y un proceso de olas repetible.",
  "La coordinación con Infraestructura y Redes fue clave: un calendario único evitó choques entre equipos.",
];
export const reflexionEstudiantes = [
  "Vimos en la práctica el ciclo completo: acta, alcance, cronograma, costos, calidad, riesgos y cierre.",
  "Gestionar un proyecto es gestionar personas, riesgos y dependencias, más que tareas.",
  "Usamos IA para ordenar informes y practicar preguntas, validando cada resultado con nuestras fuentes.",
  "Por mejorar: acordar antes con el negocio y con Infraestructura, desde el diseño.",
];

export const compromisos = [
  { to: 100, suffix: "%", label: "alcance cumplido", color: "var(--blue-60)" },
  { to: 92, suffix: "%", label: "adopción de usuarios", color: "var(--blue-80)" },
  { to: 98.2, decimals: 1, suffix: "%", label: "exactitud de inventario", color: "var(--cyan-50)" },
];

export const fuentes = [
  ["Sobrecosto en proyectos ERP", "Entre 53% y 65% de los proyectos ERP exceden su presupuesto. Este proyecto cerró dentro de lo autorizado.", "Panorama Consulting, ERP Report"],
  ["Cierre contable", "La mediana es de 6 días y los líderes cierran en 1 a 3. La meta de 5 días está entre ambos.", "SAPinsider, Financial Close 2023"],
  ["Talento SAP", "La demanda de consultores sube porque el soporte de la versión anterior (ECC) termina en 2027.", "Intelligent CIO LATAM (2026)"],
  ["Acompañamiento tras el arranque", "Lo típico es de 2 a 8 semanas; cada ola tuvo de 5 a 6.", "SAP, Hypercare Service (2026)"],
];

export const preguntas = [
  ["¿Por qué licencia propia en AWS y no RISE, si empataron?", "Por el control sobre los cambios y su calendario; la infraestructura queda dentro del programa."],
  ["¿Hubo gastos por encima de lo estimado?", "Sí, USD 2.7 M, cubiertos con la contingencia prevista. El costo total quedó debajo de lo autorizado."],
  ["¿Qué pasaba si una ola no estaba lista?", "Había criterios para decidir si se arrancaba; si no se cumplían, la ola se posponía. No fue necesario."],
  ["¿Cómo se conserva el conocimiento al salir el equipo?", "Con manuales por rol, usuarios clave capacitados y un equipo de soporte formado."],
];
