const fragmentSrc = /* wgsl */ `

  struct UniformData {
    screenSize: vec2<f32>
  };

  @group(0) @binding(0) var<uniform> uniforms: UniformData;

  @fragment
  fn main(@location(0) normalized: vec2<f32>) -> @location(0) vec4<f32> {
    let color = vec3<f32>(normalized, 0);
    return vec4<f32>(color, 1);
  }
`;

export default fragmentSrc;
