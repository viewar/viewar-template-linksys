export function fromAxisAngle(axis, angle) {
  switch (axis) {
    case 'x': return { w: Math.cos(angle / 2), x: Math.sin(angle / 2), y: 0, z: 0 };
    case 'y': return { w: Math.cos(angle / 2), x: 0, y: Math.sin(angle / 2), z: 0 };
    case 'z': return { w: Math.cos(angle / 2), x: 0, y: 0, z: Math.sin(angle / 2) };
  }
}

export function multiply(q1, q2) {
  return {
    w: -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w,
    x:  q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x,
    y: -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y,
    z:  q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z
  };
}

export function normalize({w, x, y, z}) {
  const n = Math.sqrt(w * w + x * x + y * y + z * z);
  return {
    w: w / n,
    x: x / n,
    y: y / n,
    z: z / n,
  };
}

export function scale({w, x, y, z}, scale) {
  return {
    w: w * scale,
    x: x * scale,
    y: y * scale,
    z: z * scale,
  };
}

export function conjugate({w, x, y, z}) {
  return {
    w: w,
    x: -x,
    y: -y,
    z: -z,
  };
}
