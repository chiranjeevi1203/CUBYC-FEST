import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Owns a ShaderMaterial whose `uniforms` object is exactly the one passed in,
 * so per-frame writes (`uniforms.uTime.value = t`) always reach the GPU.
 * (R3F v9 copies uniforms passed as a JSX prop, which would break that link.)
 * `options` is only read on creation.
 */
export function useShaderMaterial(shader, uniforms, options) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        uniforms,
        ...options,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shader, uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}
