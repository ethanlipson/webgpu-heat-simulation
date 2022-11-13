const computeSrc = /* wgsl */ `
  struct HeatData {
    lattice: array<f32>
  }

  @group(0) @binding(1) var<storage, read_write> heatData: HeatData;

  @compute @workgroup_size(1, 1)
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    heatData.lattice[global_id.x] += 0.01;
  }
`;

export default computeSrc;
