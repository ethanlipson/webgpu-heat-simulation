const diffuseSrc = /* wgsl */ `
  struct HeatData {
    lattice: array<f32>
  }

  struct MouseData {
    button: f32,
    x: f32,
    y: f32,
    r: f32
  }

  @group(0) @binding(0) var<storage, read_write> heatData: HeatData;
  @group(0) @binding(1) var<storage, read_write> heatDataCopy: HeatData;
  @group(0) @binding(2) var<uniform> mouseData: MouseData;

  @id(0) override numCellsX: f32;
  @id(1) override numCellsY: f32;

  fn getVal(coords: vec2<i32>) -> f32 {
    let index = coords.y * i32(numCellsX) + coords.x;
    let val = heatData.lattice[index];
    return val;
  }

  @compute @workgroup_size(1, 1)
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let coords = vec2<i32>(global_id.xy);
    let index = coords.y * i32(numCellsX) + coords.x;

    let mouseDistSq = pow(f32(coords.x) - mouseData.x * f32(numCellsX), 2) + pow(f32(coords.y) - mouseData.y * f32(numCellsY), 2);
    if (mouseDistSq <= mouseData.r * mouseData.r) {
      if (mouseData.button == 1) {
        heatDataCopy.lattice[index] = 1;
        return;
      }
      if (mouseData.button == 2) {
        heatDataCopy.lattice[index] = 0;
        return;
      }
    }

    var laplacian = 0.;
    let curr = getVal(coords);

    if (coords.x != 0) {
      laplacian += getVal(coords - vec2<i32>(1, 0)) - curr;
    }
    if (coords.x != i32(numCellsX) - 1) {
      laplacian += getVal(coords + vec2<i32>(1, 0)) - curr;
    }
    if (coords.y != 0) {
      laplacian += getVal(coords - vec2<i32>(0, 1)) - curr;
    }
    if (coords.y != i32(numCellsY) - 1) {
      laplacian += getVal(coords + vec2<i32>(0, 1)) - curr;
    }

    heatDataCopy.lattice[index] = curr + laplacian * 0.2;
  }
`;

export default diffuseSrc;
