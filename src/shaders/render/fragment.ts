const fragmentSrc = /* wgsl */ `

  struct UniformData {
    screenSize: vec2<f32>
  };

  struct HeatData {
    lattice: array<f32>
  }

  @id(0) override numCellsX: f32;
  @id(1) override numCellsY: f32;

  @group(0) @binding(0) var<uniform> uniforms: UniformData;
  @group(0) @binding(1) var<storage, read_write> heatData: HeatData;

  fn getVal(coords: vec2<i32>) -> f32 {
    let index = coords.y * i32(numCellsX) + coords.x;
    let val = heatData.lattice[index];
    return val;
  }

  @fragment
  fn main(@location(0) normalized: vec2<f32>) -> @location(0) vec4<f32> {
    let numCells = vec2<f32>(numCellsX, numCellsY);
    let coords = vec2<i32>(normalized * numCells);
    
    let val = getVal(coords);
    let color = vec3<f32>(val);
    return vec4<f32>(color, 1);
  }
`;

export default fragmentSrc;
