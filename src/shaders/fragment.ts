const fragmentSrc = /* wgsl */ `

  struct UniformData {
    screenSize: vec2<f32>
  };

  struct HeatData {
    lattice: array<f32>
  }

  @group(0) @binding(0) var<uniform> uniforms: UniformData;
  @group(0) @binding(1) var<storage, read_write> heatData: HeatData;

  @fragment
  fn main(@location(0) normalized: vec2<f32>) -> @location(0) vec4<f32> {
    let color = vec3<f32>(heatData.lattice[0], 0, 0);
    return vec4<f32>(color, 1);
  }
`;

export default fragmentSrc;
