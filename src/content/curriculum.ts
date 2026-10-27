import type { Unit } from './types';
import { UNIT1_ITEMS, UNIT1_LESSONS } from './unit1';

export const ALL_ITEMS = UNIT1_ITEMS;
export const ALL_LESSONS = UNIT1_LESSONS;

// Ruta alineada con los descriptores del MCER (orientativa; la app no certifica niveles).
export const UNITS: Unit[] = [
  {
    id: 1, level: 'A1', title: 'Primeros pasos', available: true,
    objectives: ['Saludar y despedirte', 'Presentarte', 'Pedir en un café', 'Nombrar objetos con su género', 'Contar del 1 al 5', 'être y avoir en presente']
  },
  {
    id: 2, level: 'A1', title: 'Mi día y mi gente', available: false,
    objectives: ['Familia y posesivos (mon, ma, mes)', 'Rutina con verbos en -er', 'La hora y los días', 'Números hasta 100', 'Negación ne…pas']
  },
  {
    id: 3, level: 'A1', title: 'Comer, comprar, moverse', available: false,
    objectives: ['Artículos partitivos (du, de la)', 'à + le = au, de + le = du', 'Pedir direcciones', 'aller + infinitivo (futuro próximo)', 'Preguntas con est-ce que']
  },
  {
    id: 4, level: 'A2', title: 'Contar lo que pasó', available: false,
    objectives: ['Passé composé con avoir y être', 'Imparfait para descripciones', 'Pronombres de objeto (le, la, lui)', 'y / en']
  },
  {
    id: 5, level: 'A2', title: 'Planes y opiniones', available: false,
    objectives: ['Futur simple', 'Comparativos', 'Expresar gustos y opiniones', 'Resolver gestiones (citas, reservaciones)']
  },
  {
    id: 6, level: 'B1', title: 'Hablar con soltura', available: false,
    objectives: ['Condicional', 'Subjuntivo tras il faut que, bien que', 'Relativos qui, que, dont, où', 'Discurso indirecto']
  },
  {
    id: 7, level: 'B2', title: 'Argumentar', available: false,
    objectives: ['Hipótesis complejas (si + plus-que-parfait)', 'Conectores argumentativos', 'Registro formal vs. français parlé']
  }
];

/** Criterio de dominio de una unidad (informe §8.2: no por puntos ni rachas). */
export const MASTERY_RULE = {
  /** Proporción de tarjetas productivas (ES→FR) con estabilidad ≥ minStability. */
  minShare: 0.8,
  minStabilityDays: 7,
  /** El examen de dominio solo cuenta si los ítems se introdujeron hace al menos estos días (recuperación diferida). */
  minDelayDays: 3,
  examSize: 12,
  examPass: 0.8
};
