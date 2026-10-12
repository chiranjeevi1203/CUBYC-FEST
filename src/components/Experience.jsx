import { memo, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { CAMERA } from '../config/experience';
import { useExperience } from '../store/useExperience';
import CameraRig from './scene/CameraRig';
import SkyStars from './scene/SkyStars';
import SpiralGalaxy from './scene/SpiralGalaxy';
import WarpField from './scene/WarpField';
import NebulaClouds from './scene/NebulaClouds';
import SolarSystem from './scene/SolarSystem';
import BackgroundDetails from './scene/BackgroundDetails';
import PlanetInteraction from './scene/PlanetInteraction';

/**
 * Compiles every shader before the timeline starts (objects hidden by their
 * reveal gates are made visible just for the compile), then waits two frames.
 */
function SceneReady() {
  const { gl, scene, camera } = useThree();
  const setCanvasReady = useExperience((s) => s.setCanvasReady);

  useEffect(() => {
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) {
        o.visible = true;
        hidden.push(o);
      }
    });
    gl.compile(scene, camera);
    hidden.forEach((o) => {
      o.visible = false;
    });
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setCanvasReady());
    });
    return () => cancelAnimationFrame(raf);
  }, [gl, scene, camera, setCanvasReady]);

  return null;
}

/**
 * The ONE persistent WebGL canvas. Mounted once at the app root and never
 * unmounted: the loader HUD and the landing page are DOM layers above it.
 */
function Experience() {
  const quality = useExperience((s) => s.quality);
  const [dpr, setDpr] = useState(() => {
    const max = quality === 'low' ? 1.5 : 2;
    return Math.min(Math.max(window.devicePixelRatio || 1, 1), max);
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-0 bg-black" aria-hidden="true">
      <Canvas
        dpr={dpr}
        camera={{ position: CAMERA.start.pos, fov: CAMERA.baseFov, near: 0.1, far: 3000 }}
        gl={{ antialias: quality !== 'low', alpha: false, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => gl.setClearColor('#000000', 1)}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        {/* CameraRig first so every camera-attached layer reads this frame's pose. */}
        <CameraRig />
        <SkyStars quality={quality} />
        <BackgroundDetails quality={quality} />
        <NebulaClouds quality={quality} />
        <SpiralGalaxy quality={quality} />
        <SolarSystem quality={quality} />
        {/* After SolarSystem so planet positions are current when picking. */}
        <PlanetInteraction />
        <WarpField quality={quality} />
        <SceneReady />
      </Canvas>
      <div className="space-vignette absolute inset-0" />
    </div>
  );
}

export default memo(Experience);
