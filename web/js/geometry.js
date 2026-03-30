// Excentoid geometry — generator circles and ruled surface mesh generation
import { sub3, cross3, normalize3, lerp3 } from './math.js';

export const SHAPE_NAMES = {
    2: 'Duploid', 3: 'Trioid', 4: 'Quadroid', 5: 'Pentaoid',
    6: 'Hexaoid', 7: 'Heptaoid', 8: 'Octaoid', 9: 'Nonaoid'
};

export function getGeneratorCircle(k, n, psi, anti) {
    const e = 1.0;
    const r = psi * e;
    if (n <= 3) return getCirclePaper(k, n, e, r, anti);
    return getCircleGeneral(k, n, e, r, anti);
}

function getCirclePaper(k, n, e, r, anti) {
    const sign = anti ? -1 : 1;
    const circles = [
        { plane: 'xy', cx: -e * sign, cy: e },
        { plane: 'xz', cx: e, cz: -e * sign },
        { plane: 'yz', cy: -e * sign, cz: e },
    ];
    const c = circles[k % 3];
    if (c.plane === 'xy') return (t) => [c.cx + r * Math.cos(t), c.cy + r * Math.sin(t), 0];
    if (c.plane === 'xz') return (t) => [c.cx + r * Math.cos(t), 0, c.cz + r * Math.sin(t)];
    return (t) => [0, c.cy + r * Math.cos(t), c.cz + r * Math.sin(t)];
}

function getCircleGeneral(k, n, e, r, anti) {
    const angle = k * Math.PI / n;
    const phaseOffset = anti ? Math.PI : 0;
    const ax = 1/Math.sqrt(3), ay = ax, az = ax;
    const c = Math.cos(angle), s = Math.sin(angle);

    function rotateVec(vx, vy, vz) {
        const dot = ax*vx + ay*vy + az*vz;
        const cx_ = ay*vz - az*vy, cy_ = az*vx - ax*vz, cz_ = ax*vy - ay*vx;
        return [vx*c+cx_*s+ax*dot*(1-c), vy*c+cy_*s+ay*dot*(1-c), vz*c+cz_*s+az*dot*(1-c)];
    }

    const normal = rotateVec(0, 0, 1);
    let up = Math.abs(normal[1]) < 0.9 ? [0,1,0] : [1,0,0];
    let U = normalize3(cross3(up, normal));
    let V = cross3(normal, U);
    const offAngle = 2 * Math.PI * k / n + Math.PI/4 + phaseOffset;
    const cx = e * (Math.cos(offAngle)*U[0] + Math.sin(offAngle)*V[0]);
    const cy = e * (Math.cos(offAngle)*U[1] + Math.sin(offAngle)*V[1]);
    const cz = e * (Math.cos(offAngle)*U[2] + Math.sin(offAngle)*V[2]);

    return (t) => [
        cx + r*(Math.cos(t)*U[0] + Math.sin(t)*V[0]),
        cy + r*(Math.cos(t)*U[1] + Math.sin(t)*V[1]),
        cz + r*(Math.cos(t)*U[2] + Math.sin(t)*V[2])
    ];
}

export function generateRuledSurface(circleA, circleB, resT, resS) {
    const positions = [], normals = [], indices = [];
    const dt = (2 * Math.PI) / resT, ds = 1.0 / resS, eps = 1e-4;

    for (let i = 0; i <= resT; i++) {
        const t = i * dt;
        const pA = circleA(t), pB = circleB(t);
        const pA1 = circleA(t+eps), pA0 = circleA(t-eps);
        const pB1 = circleB(t+eps), pB0 = circleB(t-eps);
        const dAdt = [(pA1[0]-pA0[0])/(2*eps),(pA1[1]-pA0[1])/(2*eps),(pA1[2]-pA0[2])/(2*eps)];
        const dBdt = [(pB1[0]-pB0[0])/(2*eps),(pB1[1]-pB0[1])/(2*eps),(pB1[2]-pB0[2])/(2*eps)];
        const ruling = sub3(pB, pA);

        for (let j = 0; j <= resS; j++) {
            const s = j * ds;
            const p = lerp3(pA, pB, s);
            positions.push(p[0], p[1], p[2]);
            const tangentT = [(1-s)*dAdt[0]+s*dBdt[0], (1-s)*dAdt[1]+s*dBdt[1], (1-s)*dAdt[2]+s*dBdt[2]];
            const n = normalize3(cross3(tangentT, ruling));
            normals.push(n[0], n[1], n[2]);
        }
    }

    for (let i = 0; i < resT; i++)
        for (let j = 0; j < resS; j++) {
            const a = i*(resS+1)+j, b = a+1, c = (i+1)*(resS+1)+j, d = c+1;
            indices.push(a,c,b, b,c,d);
        }

    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}

export function generateCircleLine(circleFunc, res) {
    const positions = [];
    for (let i = 0; i <= res; i++) {
        const t = (i / res) * 2 * Math.PI;
        const p = circleFunc(t);
        positions.push(p[0], p[1], p[2]);
    }
    return new Float32Array(positions);
}
