const vertexSrc = /*wgsl*/ `
  struct VSOut {
    @builtin(position) Position: vec4<f32>,
    @location(0) normalized: vec2<f32>
  }

  @vertex
  fn main(@location(0) inPos: vec2<f32>) -> VSOut {
    var vsOut: VSOut;
    vsOut.Position = vec4<f32>(inPos, 0, 1);
    vsOut.normalized = inPos * .5 + .5;
    return vsOut;
  }
`;

export default vertexSrc;
