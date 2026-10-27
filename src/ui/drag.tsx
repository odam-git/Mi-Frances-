// Arrastrar y soltar con Pointer Events (dedo, ratón o lápiz) sin dependencias.
// Los destinos se marcan con data-drop="<id>". Alternativa accesible: tocar la ficha y luego el destino.
import { useCallback, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';

interface DragState {
  payload: string;
  x: number;
  y: number;
  over: string | null;
  label: ReactNode;
}

export function useDragDrop(onDrop: (payload: string, target: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const targetAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null;
    return el?.dataset.drop ?? null;
  };

  const bind = useCallback(
    (payload: string, label: ReactNode) => ({
      onPointerDown(e: RPointerEvent<HTMLElement>) {
        if (e.button !== 0) return;
        start.current = { x: e.clientX, y: e.clientY, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      },
      onPointerMove(e: RPointerEvent<HTMLElement>) {
        const s = start.current;
        if (!s) return;
        if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) return;
        s.moved = true;
        setDrag({ payload, x: e.clientX, y: e.clientY, over: targetAt(e.clientX, e.clientY), label });
      },
      onPointerUp(e: RPointerEvent<HTMLElement>) {
        const s = start.current;
        start.current = null;
        if (s?.moved) {
          const t = targetAt(e.clientX, e.clientY);
          setDrag(null);
          if (t) onDrop(payload, t);
          // Evita que el «click» posterior seleccione la ficha.
          e.preventDefault();
          (e.currentTarget as HTMLElement).dataset.justDragged = '1';
          setTimeout(() => delete (e.currentTarget as HTMLElement | null)?.dataset?.justDragged, 50);
        }
      },
      onPointerCancel() {
        start.current = null;
        setDrag(null);
      }
    }),
    [onDrop]
  );

  const ghost = drag ? (
    <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
      {drag.label}
    </div>
  ) : null;

  return { bind, ghost, dragging: drag?.payload ?? null, over: drag?.over ?? null };
}

/** true si el click viene justo después de un arrastre (para ignorarlo). */
export const wasDragged = (el: EventTarget) => (el as HTMLElement).dataset?.justDragged === '1';
