const diffuseSrc = /* wgsl */ `
  struct HeatData {
    lattice: array<f32>
  }

  @group(0) @binding(1) var<storage, read_write> heatData: HeatData;
  @group(0) @binding(2) var<storage, read_write> heatDeltas: HeatData;

  @id(0) override numCellsX: f32;
  @id(1) override numCellsY: f32;

  fn getVal(coords: vec2<i32>) -> f32 {
    let index = coords.y * i32(numCellsX) + coords.x;
    let val = heatData.lattice[index];
    return val;
  }

  @compute @workgroup_size(1, 1)
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = vec2<i32>(global_id.xy);
    var laplacian = 0.;
    let curr = getVal(idx);

    if (idx.x != 0) {
      laplacian += getVal(idx - vec2<i32>(1, 0)) - curr;
    }
    if (idx.x != i32(numCellsX) - 1) {
      laplacian += getVal(idx + vec2<i32>(1, 0)) - curr;
    }
    if (idx.y != 0) {
      laplacian += getVal(idx - vec2<i32>(0, 1)) - curr;
    }
    if (idx.y != i32(numCellsY) - 1) {
      laplacian += getVal(idx + vec2<i32>(0, 1)) - curr;
    }

    heatDeltas.lattice[idx.y * i32(numCellsX) + idx.x] = laplacian * 0.2;
  }
`;

export default diffuseSrc;
