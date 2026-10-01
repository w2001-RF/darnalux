import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
}

// Pointer-based drawing surface (mouse, touch and stylus).
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void; label: string }>(function SignaturePad(
  { onChange, label },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const empty = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111827';
  }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
      empty.current = true;
      onChange?.(true);
    },
    isEmpty: () => empty.current,
    toBlob: () =>
      new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas || empty.current) return resolve(null);
        canvas.toBlob(resolve, 'image/png');
      }),
  }));

  return (
    <canvas
      ref={canvasRef}
      className="signature-pad"
      role="img"
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const context = event.currentTarget.getContext('2d');
        const { x, y } = point(event);
        context?.beginPath();
        context?.moveTo(x, y);
        drawing.current = true;
      }}
      onPointerMove={(event) => {
        if (!drawing.current) return;
        const context = event.currentTarget.getContext('2d');
        const { x, y } = point(event);
        context?.lineTo(x, y);
        context?.stroke();
        if (empty.current) {
          empty.current = false;
          onChange?.(false);
        }
      }}
      onPointerUp={() => {
        drawing.current = false;
      }}
      onPointerLeave={() => {
        drawing.current = false;
      }}
    />
  );
});
