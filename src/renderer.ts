import { createBuffer } from './common';
import fragmentSrc from './shaders/fragment';
import vertexSrc from './shaders/vertex';

class Renderer {
  device: GPUDevice;
  context: GPUCanvasContext;
  canvas: HTMLCanvasElement;

  pipeline: GPURenderPipeline;
  verticesBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;

  constructor(device: GPUDevice, context: GPUCanvasContext) {
    this.device = device;
    this.context = context;
    this.canvas = context.canvas as HTMLCanvasElement;

    // prettier-ignore
    const vertices = new Float32Array([
        -1, -1,
         1, -1,
         1,  1,
        -1, -1,
        -1,  1,
         1,  1,
      ]);

    this.verticesBuffer = createBuffer(
      device,
      vertices.byteLength,
      GPUBufferUsage.VERTEX,
      vertices
    );
    const uniformBuffer = createBuffer(
      device,
      8,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      [this.canvas.width, this.canvas.height]
    );

    const uniformBindGroupLayoutEntry: GPUBindGroupLayoutEntry = {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' },
    };
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [uniformBindGroupLayoutEntry],
    });
    const bindGroupEntry: GPUBindGroupEntry = {
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      },
    };
    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [bindGroupEntry],
    });

    const vertModule = device.createShaderModule({ code: vertexSrc });
    const fragModule = device.createShaderModule({ code: fragmentSrc });

    const vertexAttribDesc: GPUVertexAttribute = {
      shaderLocation: 0,
      offset: 0,
      format: 'float32x2',
    };
    const vertexBufferDesc: GPUVertexBufferLayout = {
      attributes: [vertexAttribDesc],
      arrayStride: 4 * 2,
      stepMode: 'vertex',
    };

    const colorState: GPUColorTargetState = {
      format: 'bgra8unorm',
    };

    const pipelineLayoutDesc = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });
    this.pipeline = device.createRenderPipeline({
      layout: pipelineLayoutDesc,
      vertex: {
        module: vertModule,
        entryPoint: 'main',
        buffers: [vertexBufferDesc],
      },
      fragment: {
        module: fragModule,
        entryPoint: 'main',
        targets: [colorState],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  render() {
    const colorTexture = this.context.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

    const colorAttachment: GPURenderPassColorAttachment = {
      view: colorTextureView,
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    };

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment],
    };

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setViewport(0, 0, this.canvas.width, this.canvas.height, 0, 1);
    passEncoder.setScissorRect(0, 0, this.canvas.width, this.canvas.height);
    passEncoder.setVertexBuffer(0, this.verticesBuffer);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(6);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}

export default Renderer;
