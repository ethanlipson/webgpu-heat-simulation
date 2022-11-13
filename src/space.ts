import { createBuffer } from './common';
import computeSrc from './shaders/compute';
import fragmentSrc from './shaders/fragment';
import vertexSrc from './shaders/vertex';

class Space {
  device: GPUDevice;
  context: GPUCanvasContext;
  canvas: HTMLCanvasElement;

  renderPipeline: GPURenderPipeline;
  computePipeline: GPUComputePipeline;
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
    const heatBuffer = createBuffer(device, 4, GPUBufferUsage.STORAGE, [0.5]);

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
    ];
    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: bindGroupEntries,
    });

    const vertModule = device.createShaderModule({ code: vertexSrc });
    const fragModule = device.createShaderModule({ code: fragmentSrc });
    const compModule = device.createShaderModule({ code: computeSrc });

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
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: { module: compModule, entryPoint: 'main' },
    });
  }

  step() {
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.computePipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.dispatchWorkgroups(1, 1);
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
    passEncoder.setViewport(0, 0, this.canvas.width, this.canvas.height, 0, 1);
    passEncoder.setScissorRect(0, 0, this.canvas.width, this.canvas.height);
    passEncoder.setVertexBuffer(0, this.verticesBuffer);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(6);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}

export default Space;
