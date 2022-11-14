import { createBuffer } from './common';
import diffuseSrc from './shaders/compute/diffuse';
import fragmentSrc from './shaders/render/fragment';
import vertexSrc from './shaders/render/vertex';

export type MouseState = {
  pressed: 'left' | 'right' | 'none';
  x: number;
  y: number;
  r: number;
};

class Space {
  device: GPUDevice;
  context: GPUCanvasContext;
  canvas: HTMLCanvasElement;

  renderPipeline: GPURenderPipeline;
  diffusePipeline: GPUComputePipeline;
  verticesBuffer: GPUBuffer;
  heatBuffer: GPUBuffer;
  heatCopyBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;

  numCellsX: number;
  numCellsY: number;

  mouseState: MouseState = { pressed: 'none', x: 0, y: 0, r: 20 };

  constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    numCellsX: number,
    numCellsY: number
  ) {
    this.device = device;
    this.context = context;
    this.canvas = context.canvas as HTMLCanvasElement;

    this.numCellsX = numCellsX;
    this.numCellsY = numCellsY;

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
    this.heatBuffer = createBuffer(
      device,
      numCellsX * numCellsY * 4,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      Array(numCellsX * numCellsY)
        .fill(0)
        .map((_, i) => (i < (numCellsX * numCellsY) / 2 ? 1 : 0))
    );
    this.heatCopyBuffer = createBuffer(
      device,
      numCellsX * numCellsY * 4,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );
    this.uniformBuffer = createBuffer(
      device,
      16,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      [0, 0, 0, 10]
    );

    const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: { type: 'storage' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' },
      },
    ];
    const bindGroupLayout = device.createBindGroupLayout({
      entries: bindGroupLayoutEntries,
    });
    const bindGroupEntries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: this.heatBuffer } },
      { binding: 1, resource: { buffer: this.heatCopyBuffer } },
      {
        binding: 2,
        resource: {
          buffer: this.uniformBuffer,
        },
      },
    ];
    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: bindGroupEntries,
    });

    const vertModule = device.createShaderModule({ code: vertexSrc });
    const fragModule = device.createShaderModule({ code: fragmentSrc });
    const diffuseModule = device.createShaderModule({ code: diffuseSrc });

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

    this.renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: vertModule,
        entryPoint: 'main',
        buffers: [vertexBufferDesc],
      },
      fragment: {
        module: fragModule,
        entryPoint: 'main',
        targets: [colorState],
        constants: { 0: numCellsX, 1: numCellsY },
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.diffusePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: diffuseModule,
        entryPoint: 'main',
        constants: { 0: numCellsX, 1: numCellsY },
      },
    });
  }

  step() {
    const mouseButton =
      this.mouseState.pressed === 'left'
        ? 1
        : this.mouseState.pressed === 'right'
        ? 2
        : 0;
    const arrayBuffer = new Float32Array([
      mouseButton,
      this.mouseState.x / this.canvas.width,
      this.mouseState.y / this.canvas.height,
      this.mouseState.r,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, arrayBuffer);

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setPipeline(this.diffusePipeline);
    passEncoder.dispatchWorkgroups(this.numCellsX, this.numCellsY);
    passEncoder.end();
    commandEncoder.copyBufferToBuffer(
      this.heatCopyBuffer,
      0,
      this.heatBuffer,
      0,
      this.numCellsX * this.numCellsY * 4
    );

    this.device.queue.submit([commandEncoder.finish()]);
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
    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setVertexBuffer(0, this.verticesBuffer);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(6);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  setMouseState(mouseState: MouseState) {
    this.mouseState = mouseState;
  }
}

export default Space;
