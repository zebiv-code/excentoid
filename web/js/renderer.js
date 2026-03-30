// WebGL2 renderer — shader compilation, VAO management, draw loop
import { solidVert, solidFrag, lineVert, lineFrag } from './shaders.js';
import { mat4Perspective, mat4LookAt, mat4Multiply, mat4Identity, mat3NormalFromMat4, hslToRgb } from './math.js';
import { getGeneratorCircle, generateRuledSurface, generateCircleLine } from './geometry.js';

export function createRenderer(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) {
        document.body.innerHTML = '<p style="color:#fff;padding:40px;">WebGL 2 not supported.</p>';
        return null;
    }

    function compileShader(src, type) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    }

    function createProgram(vSrc, fSrc) {
        const p = gl.createProgram();
        gl.attachShader(p, compileShader(vSrc, gl.VERTEX_SHADER));
        gl.attachShader(p, compileShader(fSrc, gl.FRAGMENT_SHADER));
        gl.linkProgram(p);
        return p;
    }

    const solidProg = createProgram(solidVert, solidFrag);
    const lineProg = createProgram(lineVert, lineFrag);

    const solidUniforms = {
        uMVP: gl.getUniformLocation(solidProg, 'uMVP'),
        uModel: gl.getUniformLocation(solidProg, 'uModel'),
        uNormalMatrix: gl.getUniformLocation(solidProg, 'uNormalMatrix'),
        uEye: gl.getUniformLocation(solidProg, 'uEye'),
        uNumPatches: gl.getUniformLocation(solidProg, 'uNumPatches'),
    };
    const lineUniforms = { uMVP: gl.getUniformLocation(lineProg, 'uMVP') };

    let surfaceVAOs = [], circleVAOs = [], wireframeVAOs = [];

    function createSurfaceVAO(mesh, patchId) {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(solidProg, 'aPos');
        gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        const normBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
        const normLoc = gl.getAttribLocation(solidProg, 'aNormal');
        gl.enableVertexAttribArray(normLoc); gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
        const patchData = new Float32Array(mesh.positions.length / 3).fill(patchId);
        const patchBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, patchBuf);
        gl.bufferData(gl.ARRAY_BUFFER, patchData, gl.STATIC_DRAW);
        const patchLoc = gl.getAttribLocation(solidProg, 'aPatchId');
        gl.enableVertexAttribArray(patchLoc); gl.vertexAttribPointer(patchLoc, 1, gl.FLOAT, false, 0, 0);
        const idxBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        return { vao, count: mesh.indices.length };
    }

    function createWireframeVAO(mesh) {
        const lineIndices = [], edgeSet = new Set();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a=mesh.indices[i],b=mesh.indices[i+1],c=mesh.indices[i+2];
            for (const [e1,e2] of [[a,b],[b,c],[c,a]]) {
                const key = Math.min(e1,e2)*100000+Math.max(e1,e2);
                if (!edgeSet.has(key)) { edgeSet.add(key); lineIndices.push(e1,e2); }
            }
        }
        const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        const posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(lineProg, 'aPos');
        gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        const colors = new Float32Array(mesh.positions.length).fill(0.4);
        const colBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        const colLoc = gl.getAttribLocation(lineProg, 'aColor');
        gl.enableVertexAttribArray(colLoc); gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);
        const idxBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(lineIndices), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        return { vao, count: lineIndices.length };
    }

    function createCircleVAO(positions, color) {
        const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        const posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(lineProg, 'aPos');
        gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        const n = positions.length / 3;
        const colors = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { colors[i*3]=color[0]; colors[i*3+1]=color[1]; colors[i*3+2]=color[2]; }
        const colBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        const colLoc = gl.getAttribLocation(lineProg, 'aColor');
        gl.enableVertexAttribArray(colLoc); gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        return { vao, count: n };
    }

    function rebuildGeometry(state) {
        for (const s of surfaceVAOs) gl.deleteVertexArray(s.vao);
        for (const w of wireframeVAOs) gl.deleteVertexArray(w.vao);
        for (const c of circleVAOs) gl.deleteVertexArray(c.vao);
        surfaceVAOs = []; wireframeVAOs = []; circleVAOs = [];

        const { n, psi, anti, resolution } = state;
        const resT = resolution, resS = Math.max(8, Math.floor(resolution / 4));
        const circles = [];
        for (let k = 0; k < n; k++) circles.push(getGeneratorCircle(k, n, psi, anti));
        for (let k = 0; k < n; k++) {
            const color = hslToRgb(k / n, 0.8, 0.6);
            circleVAOs.push(createCircleVAO(generateCircleLine(circles[k], resT), color));
        }
        for (let k = 0; k < n; k++) {
            const mesh = generateRuledSurface(circles[k], circles[(k+1)%n], resT, resS);
            surfaceVAOs.push(createSurfaceVAO(mesh, k));
            wireframeVAOs.push(createWireframeVAO(mesh));
        }
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function render(state) {
        if (state.autoRotate) state.rotY += 0.003;
        resize();

        const aspect = canvas.width / canvas.height;
        const cx = Math.cos(state.rotX);
        const eye = [
            state.distance * Math.sin(state.rotY) * cx + state.panX,
            state.distance * Math.sin(state.rotX) + state.panY,
            state.distance * Math.cos(state.rotY) * cx
        ];
        const center = [state.panX, state.panY, 0];
        const model = mat4Identity();
        const mvp = mat4Multiply(mat4Perspective(Math.PI/4, aspect, 0.1, 100), mat4Multiply(mat4LookAt(eye, center, [0,1,0]), model));
        const normalMat = mat3NormalFromMat4(model);

        gl.clearColor(0.04, 0.04, 0.06, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        const showSolid = state.displayMode === 'solid' || state.displayMode === 'both';
        const showWire = state.displayMode === 'wireframe' || state.displayMode === 'both';

        if (showSolid) {
            gl.useProgram(solidProg);
            gl.uniformMatrix4fv(solidUniforms.uMVP, false, mvp);
            gl.uniformMatrix4fv(solidUniforms.uModel, false, model);
            gl.uniformMatrix3fv(solidUniforms.uNormalMatrix, false, normalMat);
            gl.uniform3fv(solidUniforms.uEye, eye);
            gl.uniform1i(solidUniforms.uNumPatches, state.n);
            for (const surf of surfaceVAOs) { gl.bindVertexArray(surf.vao); gl.drawElements(gl.TRIANGLES, surf.count, gl.UNSIGNED_INT, 0); }
        }

        if (showWire) {
            gl.useProgram(lineProg);
            gl.uniformMatrix4fv(lineUniforms.uMVP, false, mvp);
            for (const wire of wireframeVAOs) { gl.bindVertexArray(wire.vao); gl.drawElements(gl.LINES, wire.count, gl.UNSIGNED_INT, 0); }
        }

        if (state.showCircles) {
            gl.useProgram(lineProg);
            gl.uniformMatrix4fv(lineUniforms.uMVP, false, mvp);
            for (const circ of circleVAOs) { gl.bindVertexArray(circ.vao); gl.drawArrays(gl.LINE_STRIP, 0, circ.count); }
        }

        gl.bindVertexArray(null);
    }

    return { rebuildGeometry, render };
}
