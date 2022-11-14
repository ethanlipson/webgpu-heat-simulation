import { useEffect, useRef, useState } from 'react';
import Space, { MouseState } from '../src/space';
import styles from './index.module.css';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spaceRef = useRef<Space | null>(null);
  const [mouseState, setMouseState] = useState<MouseState>({
    pressed: 'none',
    x: 0,
    y: 0,
    r: 20,
  });

  useEffect(() => {
    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const entry = navigator.gpu;
      if (!entry) return;

      const adapter = await entry.requestAdapter();
      if (!adapter) return;

      const device = await adapter.requestDevice();

      const context = canvas.getContext('webgpu');
      if (!context) return;
      context.configure({
        device,
        format: 'bgra8unorm',
        alphaMode: 'opaque',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });

      spaceRef.current = new Space(
        device,
        context,
        500,
        Math.floor((500 * canvas.height) / canvas.width)
      );

      const loop = () => {
        const space = spaceRef.current;
        if (!space) return;

        space.step();
        space.render();

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    };

    run();
  }, []);

  useEffect(() => {
    const space = spaceRef.current;
    if (!space) return;

    space.setMouseState(mouseState);
  }, [mouseState]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      onMouseMove={e => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = rect.bottom - e.clientY;

        setMouseState(mouseState => ({ ...mouseState, x, y }));
      }}
      onMouseDown={e => {
        if (e.button === 0) {
          setMouseState(mouseState => ({ ...mouseState, pressed: 'left' }));
        } else if (e.button === 2) {
          setMouseState(mouseState => ({ ...mouseState, pressed: 'right' }));
        }
      }}
      onMouseUp={e => {
        const unpressedCurrentButton =
          (e.button === 0 && mouseState.pressed === 'left') ||
          (e.button === 2 && mouseState.pressed === 'right');

        if (unpressedCurrentButton) {
          setMouseState(mouseState => ({ ...mouseState, pressed: 'none' }));
        }
      }}
      onWheel={e => {
        setMouseState(mouseState => ({
          ...mouseState,
          r: Math.max(mouseState.r - Math.sign(e.deltaY), 5),
        }));
      }}
      onContextMenu={e => e.preventDefault()}
    />
  );
}
