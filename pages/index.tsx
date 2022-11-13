import { useEffect, useRef } from 'react';
import Renderer from '../src/renderer';
import fragmentSrc from '../src/shaders/fragment';
import vertexSrc from '../src/shaders/vertex';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

      const renderer = new Renderer(device, context);
      renderer.render();
    };

    run();
  }, []);

  return <canvas ref={canvasRef} />;
}
