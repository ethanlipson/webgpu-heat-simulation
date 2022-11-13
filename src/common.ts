export function createBuffer(
  device: GPUDevice,
  size: number,
  usage: number,
  data?: ArrayLike<number>
) {
  const buffer = device.createBuffer({
    mappedAtCreation: data !== undefined,
    size,
    usage,
  });

  if (data) {
    const arrayBuffer = buffer.getMappedRange();
    new Float32Array(arrayBuffer).set(data);
    buffer.unmap();
  }

  return buffer;
}
