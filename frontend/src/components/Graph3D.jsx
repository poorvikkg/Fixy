import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

function Graph3D({ data }) {
  const mountRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [details, setDetails] = useState(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    const width = mountNode.clientWidth;
    const height = mountNode.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent to show CSS gradient
    mountNode.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 60;
    controls.minDistance = 10;

    // Post Processing (Bloom)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.2; // Glow intensity
    bloomPass.radius = 0.5;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x00aaff, 0xffffff);
    gridHelper.material.opacity = 0.1;
    gridHelper.material.transparent = true;
    gridHelper.position.y = -6;
    scene.add(gridHelper);

    // Node & Edge Logic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const nodeMeshes = {};
    const labels = []; // For 2D HTML labels later if needed

    // Vibrant Layer Colors
    const layerColor = {
      client: 0x00d4ff,    // Cyan
      edge: 0xff00d4,      // Magenta
      traffic: 0xffaa00,   // Orange
      service: 0x00ff88,   // Neon Green
      data: 0xff4444,      // Red
      async: 0xaa66ff      // Purple
    };

    // Calculate generic force-directed or layered layout
    // Since we don't have a complex layout engine, we'll manually layer them in 3D
    const layers = {
      client: -15,
      edge: -10,
      traffic: -5,
      service: 5,
      data: 15,
      async: 10
    };

    const layerCounts = {};

    // Create Nodes
    const nodeGeometry = new THREE.IcosahedronGeometry(1.2, 1);
    const nodes = data.graph.nodes || [];
    
    nodes.forEach((node) => {
      const layerId = node.layer || 'service';
      layerCounts[layerId] = (layerCounts[layerId] || 0) + 1;
      const count = layerCounts[layerId];

      const zPos = layers[layerId] || 0;
      const xPos = (count - 1) * 6 - 10; // Spread horizontally

      const color = layerColor[layerId] || 0xffffff;

      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5,
        wireframe: true,
        transparent: true,
        opacity: 0.9
      });

      const sphere = new THREE.Mesh(nodeGeometry, material);
      sphere.position.set(xPos, Math.random() * 2 - 1, zPos);
      sphere.userData = node;

      // Inner glowing core
      const coreGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const core = new THREE.Mesh(coreGeo, coreMat);
      sphere.add(core);

      scene.add(sphere);
      nodeMeshes[node.id] = sphere;
    });

    // Create Edges
    const edges = data.graph.edges || [];
    edges.forEach(([from, to]) => {
      if (!nodeMeshes[from] || !nodeMeshes[to]) return;

      const p1 = nodeMeshes[from].position;
      const p2 = nodeMeshes[to].position;

      // Create a curved line
      const distance = p1.distanceTo(p2);
      const controlPoint = p1.clone().lerp(p2, 0.5);
      controlPoint.y += distance * 0.2; // Arc height

      const curve = new THREE.QuadraticBezierCurve3(p1, controlPoint, p2);
      const points = curve.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: 0x444466,
        transparent: true,
        opacity: 0.6
      });

      const line = new THREE.Line(geometry, material);
      scene.add(line);
    });

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 2, 50);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    // Particle Flow Animation
    const flowPath = [];
    if (nodes.length > 0) {
      // Build a simple flow path finding logical connections
      const client = nodes.find(n => n.layer === 'client');
      const edge = nodes.find(n => n.layer === 'edge' || n.layer === 'traffic');
      const service = nodes.find(n => n.layer === 'service');
      const dataNode = nodes.find(n => n.layer === 'data');
      
      [client, edge, service, dataNode].forEach(n => {
        if (n && nodeMeshes[n.id]) flowPath.push(nodeMeshes[n.id].position.clone());
      });
    }

    const particleGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particle = new THREE.Mesh(particleGeo, particleMat);
    particle.visible = false;
    scene.add(particle);

    let timeProgress = 0;
    let segment = 0;

    // Animation Loop
    let reqId;
    const clock = new THREE.Clock();

    function animate() {
      reqId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Rotate nodes slightly
      Object.values(nodeMeshes).forEach((mesh, idx) => {
        mesh.rotation.y += delta * 0.5;
        mesh.rotation.x += delta * 0.2;
        mesh.position.y += Math.sin(time * 2 + idx) * 0.005; // Hover effect
      });

      controls.update();

      // Flow particle animation
      if (play && flowPath.length > 1) {
        particle.visible = true;
        const p1 = flowPath[segment];
        const p2 = flowPath[segment + 1];

        if (p1 && p2) {
          // Add curve to particle movement
          const dist = p1.distanceTo(p2);
          const cp = p1.clone().lerp(p2, 0.5);
          cp.y += dist * 0.2;
          
          const curve = new THREE.QuadraticBezierCurve3(p1, cp, p2);
          const pos = curve.getPoint(timeProgress);
          particle.position.copy(pos);

          timeProgress += delta * 1.5; // Speed

          if (timeProgress >= 1) {
            timeProgress = 0;
            segment++;
            if (segment >= flowPath.length - 1) {
              segment = 0;
            }
          }
        }
      } else {
        particle.visible = false;
      }

      composer.render();
    }
    animate();

    // Resize Handler
    function onWindowResize() {
      if (!mountNode) return;
      const currentWidth = mountNode.clientWidth;
      const currentHeight = mountNode.clientHeight;
      camera.aspect = currentWidth / currentHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentWidth, currentHeight);
      composer.setSize(currentWidth, currentHeight);
    }
    window.addEventListener("resize", onWindowResize);

    // Click Handler
    function onClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Only intersect with spheres (not cores or lines)
      const meshes = Object.values(nodeMeshes);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const node = obj.userData;
        
        // Highlight logic
        meshes.forEach(m => {
          m.material.emissiveIntensity = 0.2;
          m.scale.set(1, 1, 1);
        });
        obj.material.emissiveIntensity = 1.0;
        obj.scale.set(1.3, 1.3, 1.3);

        setSelectedNode(node);

        const service = (data.services || []).find(s => s.service === node.id);
        if (service) {
          setDetails(service.internalStructure);
        } else {
          setDetails(null);
        }
      } else {
        setSelectedNode(null);
        setDetails(null);
        meshes.forEach(m => {
          m.material.emissiveIntensity = 0.5;
          m.scale.set(1, 1, 1);
        });
      }
    }
    renderer.domElement.addEventListener("click", onClick);

    // Cleanup
    return () => {
      window.removeEventListener("resize", onWindowResize);
      renderer.domElement.removeEventListener("click", onClick);
      cancelAnimationFrame(reqId);
      if (mountNode && mountNode.contains(renderer.domElement)) {
        mountNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [data, play]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* 3D Canvas Container */}
      <div ref={mountRef} style={{ width: "100%", height: "100%", outline: "none" }} />

      {/* Floating UI Overlay within Canvas */}
      <div className="overlay-panels" style={{ pointerEvents: "none" }}>
        <div className="top-bar">
          <div className="controls" style={{ pointerEvents: "auto" }}>
            <button 
              className="icon-btn" 
              onClick={() => setPlay(!play)}
              title={play ? "Stop Data Flow" : "Simulate Data Flow"}
            >
              {play ? "⏸" : "▶"}
            </button>
          </div>
        </div>

        {/* Selected Node Details Info Panel */}
        {selectedNode && (
          <div className="glass-panel info-panel" style={{ pointerEvents: "auto" }}>
            <h3 className="info-title">
              <span className="logo-dot" style={{ background: "var(--accent)" }}></span>
              {selectedNode.label}
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <span className="tag">{selectedNode.layer}</span>
              {selectedNode.tech && <span className="tag" style={{ marginLeft: "8px", borderColor: "#ffaa00", color: "#ffaa00", background: "rgba(255,170,0,0.1)" }}>{selectedNode.tech}</span>}
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Component responsible for processing within the {selectedNode.layer} layer.
            </p>

            {details && (
              <div style={{ marginTop: "1.5rem" }}>
                <h4 style={{ fontSize: "0.85rem", color: "#fff", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>
                  Low-Level Design (LLD)
                </h4>
                <ul style={{ paddingLeft: "1.2rem", color: "var(--text-main)", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {details.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {!details && data.explanation && selectedNode.layer === 'data' && (
               <div style={{ marginTop: "1.5rem" }}>
               <h4 style={{ fontSize: "0.85rem", color: "#fff", textTransform: "uppercase" }}>Data Model Insights</h4>
               <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>This component manages persistent state and adheres to the scaling tradeoffs outlined in the generated architecture.</p>
             </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Graph3D;