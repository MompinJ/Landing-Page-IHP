# Presentación Check-Eat

Presentación estática en HTML/CSS alineada con **`Check-Eat.pdf`** (presentación ejecutiva para autoridades académicas UCC). Usa el mismo sistema de diseño que el frontend (colores, tipografía, bordes 2px, fondo azul claro).

## Contenido (10 diapositivas = PDF)

| # | Tema (PDF) |
|---|------------|
| 1 | Portada — Nutrición Estudiantil, Experiencia Clínico Digital v1.0 |
| 2 | ¿Qué es verdaderamente Check-Eat? (ecosistema, transformación digital, centro de control) |
| 3 | Del cuello de botella a la automatización (paradigma actual vs estándar Check-Eat) |
| 4 | El diseño como herramienta de productividad |
| 5 | Lógica médica: motor de procedimientos antropométrico (3 niveles) |
| 6 | Centralización absoluta: motor de datos (PAN/PES, FCDB, pacientes) |
| 7 | Stack tecnológico de grado empresarial (Azure, NestJS, PostgreSQL, TypeScript) |
| 8 | Sincronización operativa con el ciclo UCC |
| 9 | Desarrollo iterativo (Fase 1 Back-Office / Fase 2 Portal paciente) |
| 10 | La solución definitiva — cierre ejecutivo |

## Cómo abrir

```bash
cd presentacion
xdg-open index.html
```

O con servidor HTTP:

```bash
python -m http.server 8080
# http://localhost:8080
```

El PDF de referencia está en `presentacion/Check-Eat.pdf`.

## Navegación

- Flechas, RePag/AvPag, espacio (siguiente)
- Inicio / Fin (primera / última)
- Clic en indicador lateral
- Contador y barra de progreso

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | 10 diapositivas (homólogas al PDF) |
| `css/styles.css` | Tokens y componentes UCC |
| `js/presentation.js` | Navegación dinámica |
| `Check-Eat.pdf` | Fuente ejecutiva de contenido |
| `assets/checkeat-icon.png` | Icono |

Sin build ni dependencias npm (solo Google Fonts por CDN).
