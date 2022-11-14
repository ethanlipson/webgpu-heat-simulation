const copySrc = /* wgsl */ `
  struct HeatData {
    lattice: array<f32>
  }

  @group(0) @binding(0) var<storage, read_write> heatData: HeatData;
  @group(0) @binding(1) var<storage, read_write> heatDataCopy: HeatData;

  @compute @workgroup_size(1, 1)
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    heatData.lattice[global_id.x] = heatDataCopy.lattice[global_id.x];
  }
`;

export default copySrc;
