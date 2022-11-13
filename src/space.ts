import { createBuffer } from './common';
import copySrc from './shaders/compute/copy';
import diffuseSrc from './shaders/compute/diffuse';
import fragmentSrc from './shaders/render/fragment';
import vertexSrc from './shaders/render/vertex';

class Space {
  device: GPUDevice;
  context: GPUCanvasContext;
  canvas: HTMLCanvasElement;

  renderPipeline: GPURenderPipeline;
  diffusePipeline: GPUComputePipeline;
  copyPipeline: GPUComputePipeline;
  verticesBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;

  numCellsX: number;
  numCellsY: number;

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
    const uniformBuffer = createBuffer(
      device,
      8,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      [this.canvas.width, this.canvas.height]
    );
    const heatBuffer = createBuffer(
      device,
      numCellsX * numCellsY * 4,
      GPUBufferUsage.STORAGE,
      Array(numCellsX * numCellsY)
        .fill(0)
        .map((_, i) => (i < (numCellsX * numCellsY) / 2 ? 1 : 0))
    );
    const heatCopyBuffer = createBuffer(
      device,
      numCellsX * numCellsY * 4,
      GPUBufferUsage.STORAGE
    );

    const uniformBindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: { type: 'storage' },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' },
      },
    ];
    const bindGroupLayout = device.createBindGroupLayout({
      entries: uniformBindGroupLayoutEntries,
    });
    const bindGroupEntries: GPUBindGroupEntry[] = [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
      { binding: 1, resource: { buffer: heatBuffer } },
      { binding: 2, resource: { buffer: heatCopyBuffer } },
    ];
    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: bindGroupEntries,
    });

    const vertModule = device.createShaderModule({ code: vertexSrc });
    const fragModule = device.createShaderModule({ code: fragmentSrc });
    const diffuseModule = device.createShaderModule({ code: diffuseSrc });
    const copyModule = device.createShaderModule({ code: copySrc });

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

    this.copyPipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: { module: copyModule, entryPoint: 'main' },
    });
  }

  step() {
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.diffusePipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.dispatchWorkgroups(this.numCellsX, this.numCellsY);
    passEncoder.setPipeline(this.copyPipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.dispatchWorkgroups(this.numCellsX, this.numCellsY);
    passEncoder.end();

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
}

export default Space;
