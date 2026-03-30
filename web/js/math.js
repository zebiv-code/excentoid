// Matrix and vector math utilities

export function sub3(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
export function cross3(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
export function dot3(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
export function normalize3(v) { const l=Math.sqrt(dot3(v,v)); return l>0?[v[0]/l,v[1]/l,v[2]/l]:[0,0,0]; }
export function lerp3(a, b, t) { return [a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1]), a[2]+t*(b[2]-a[2])]; }

export function mat4Perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
        f / aspect, 0, 0, 0, 0, f, 0, 0,
        0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0
    ]);
}

export function mat4LookAt(eye, center, up) {
    const z = normalize3(sub3(eye, center));
    const x = normalize3(cross3(up, z));
    const y = cross3(z, x);
    return new Float32Array([
        x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
        -dot3(x, eye), -dot3(y, eye), -dot3(z, eye), 1
    ]);
}

export function mat4Multiply(a, b) {
    const r = new Float32Array(16);
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
            r[i * 4 + j] = s;
        }
    return r;
}

export function mat4Identity() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
}

export function mat3NormalFromMat4(m) {
    const a00=m[0],a01=m[1],a02=m[2],a10=m[4],a11=m[5],a12=m[6],a20=m[8],a21=m[9],a22=m[10];
    const det = a00*(a11*a22-a12*a21)-a01*(a10*a22-a12*a20)+a02*(a10*a21-a11*a20);
    const id = 1.0 / det;
    return new Float32Array([
        (a11*a22-a12*a21)*id,(a02*a21-a01*a22)*id,(a01*a12-a02*a11)*id,
        (a12*a20-a10*a22)*id,(a00*a22-a02*a20)*id,(a02*a10-a00*a12)*id,
        (a10*a21-a11*a20)*id,(a01*a20-a00*a21)*id,(a00*a11-a01*a10)*id
    ]);
}

export function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2*l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c/2;
    let r, g, b;
    const h6 = h * 6;
    if (h6 < 1) { r=c; g=x; b=0; }
    else if (h6 < 2) { r=x; g=c; b=0; }
    else if (h6 < 3) { r=0; g=c; b=x; }
    else if (h6 < 4) { r=0; g=x; b=c; }
    else if (h6 < 5) { r=x; g=0; b=c; }
    else { r=c; g=0; b=x; }
    return [r+m, g+m, b+m];
}
