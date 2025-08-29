import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, ThreeEvent  } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from "three";
import URDFLoader, { URDFRobot, URDFJoint } from "urdf-loader";

const moveableColor = new THREE.Color('#ffff00');

// 🟢 RobotBuilder component
// Loads a URDF robot and allows:
//  1. Scaling with mouse scroll
//  2. Selecting joints by clicking
//  3. Dragging mouse left/right to move that joint

// 🟢 Scene wrapper component
// Creates a full 3D canvas and inserts RobotBuilder inside
const RobotBuilder = ({url}:{url: string}) => {
  // State to store the loaded robot object (from URDF)
  const [robot, setRobot] = useState<URDFRobot| null>(null);
  
  // --- Dragging logic state ---
  // Which joint is currently selected (by clicking)?
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
  const [selectedMesh, setSelectedMesh] = useState<THREE.Mesh | null>(null);

  // Used to store original color of selected joint outside of the component as it is not used in React dom
  let selectedJointColor = useRef<`#${string}` | null>(null);

  // Are we currently dragging the mouse to rotate a joint?
  const [isDragging, setIsDragging] = useState(false);

  // Are we currently rotating the robot?
  const [isRotating, setIsRotating] = useState(false);

  // Last recorded mouse X position (used to measure mouse movement delta)
  const lastMouseX = useRef(0);

  // Reference to the OrbitControls
  const controlsRef = useRef<OrbitControlsType | null>(null);

  // Load the URDF model once (when "url" changes)
  useEffect(() => {
    const loader = new URDFLoader();

    loader.load(
      url,
      (urdf) => {
        // Robot successfully loaded
        urdf.scale.set(1, 1, 1); // start with scale 1 (normal size)
        urdf.position.set(0, 0, 0); // position at world origin
        urdf.rotation.set(-Math.PI / 2, 0, 0); // rotate to stand upright

        // Save robot into React state so it gets rendered
        setRobot(urdf);
      },
      undefined, // onProgress callback (not used here)
      (err) => console.error("Failed to load URDF", err)
    );
  }, [url]);

  // Helper function to find the nearest URDFJoint object in the hierarchy
  const findURDFJointFromObject = useCallback((startObj: THREE.Object3D): THREE.Object3D | null => {
      let current: THREE.Object3D | null = startObj;

      while (current) {
      if (current.type === "URDFJoint") {
        return current;
      }
      current = current.parent;
      }

      return null;
  }, []);

  // 🖱️ Mouse move → while dragging, rotate the selected joint
  const onPointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); // prevent event bubbling

    if(!isDragging && !isRotating) {
      const joint = findURDFJointFromObject(e.object) as URDFJoint;
      const mesh = e.object as THREE.Mesh;
      const material = mesh.material as THREE.MeshPhongMaterial;
      selectedJointColor.current = `#${material.color.getHexString()}`
      if (joint && joint.jointValue.length) material.color.set(moveableColor);      
    }    
  },[isDragging, isRotating, findURDFJointFromObject]);

  const onPointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); // prevent event bubbling

    if (!isDragging && selectedJointColor) {
      const mesh = e.object as THREE.Mesh;
      const material = mesh.material as THREE.MeshPhongMaterial;
      material.color.set(selectedJointColor.current!);
      selectedJointColor.current = null;
    }    
  }, [isDragging]);

  // 🖱️ Mouse down → check if we clicked on a joint
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); // prevent event bubbling

    // If that mesh corresponds to a real joint in the robot
    const joint = findURDFJointFromObject(e.object) as URDFJoint;
    if (joint && joint.jointValue.length) {
      setSelectedJoint(joint.name); // save joint name
      setSelectedMesh(e.object as THREE.Mesh); //save mesh
      setIsDragging(true); // enter dragging mode
      lastMouseX.current = e.clientX; // store where the drag started
    }
  }, [findURDFJointFromObject]);

  // 🖱️ Mouse move → while dragging, rotate the selected joint
  const handlePointerMove = useCallback((e: MouseEvent) => {
    // TODO: implement joint rotation correctly
    if (robot && isDragging && selectedJoint) {
      const joint = robot.joints[selectedJoint];
      
      // Calculate horizontal movement since last frame
      const dx = e.clientX - lastMouseX.current;

      // Update "last" position for next frame
      lastMouseX.current = e.clientX;

      // Get current joint value (rotation in radians)
      const currentValue = robot.joints[selectedJoint].jointValue[0] || 0;
      
      // Compute rotation direction based on camera orientation
      const camera  = controlsRef.current!.object;
      const vector = new THREE.Vector3();
      camera.getWorldDirection(vector);
      // TODO: improve direction calculation based on vector internals. It can be a map which transforms the vector into a direction
      const direction = -Math.sign(vector.z); // either +1 or -1
      
      // Add a small increment proportional to mouse movement
      const sensitivity = 0.01; // sensitivity factor (smaller = slower rotation)
      const newValue = currentValue + dx * sensitivity * direction;

      // Apply new joint angle to the robot
      const clamped = THREE.MathUtils.clamp(newValue, joint.limit.lower, joint.limit.upper);
      robot.setJointValue(selectedJoint, clamped);
    }
  }, [robot, isDragging, selectedJoint]);

  // 🖱️ Mouse up → stop dragging
  const handlePointerUp = useCallback(() => {
    if (selectedMesh && selectedJointColor) {
      const material = selectedMesh.material as THREE.MeshPhongMaterial;
      material.color.set(selectedJointColor.current!); 
      selectedJointColor.current = null;
      setIsDragging(false);
      setSelectedJoint(null);
      setSelectedMesh(null);
    }
  }, [selectedMesh]);

  // Attach global mousemove + mouseup listeners
  useEffect(() => {
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  });


  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Canvas camera={{ position: [2, 2, 2], fov: 50 }} gl={{ antialias: true }}>
        <color attach="background" args={["#e4ebd3"]} />
        
        <ambientLight intensity={0.5} /> {/* soft global light */}
        <directionalLight position={[5, 10, 5]} intensity={1.5} /> {/* directional light */}
        
        {/* Camera controls: rotate, pan, zoom around scene */}
        <OrbitControls 
          zoomSpeed={5} 
          rotateSpeed={2} 
          minDistance={1} 
          maxDistance={10} 
          enableDamping={false} 
          enableRotate={!isDragging}  
          ref={controlsRef} 
          onStart={() => setIsRotating(true)}
          onEnd={() => setIsRotating(false)}
        />
        <>
          {/* Render robot when loaded */}
          {robot && (
            <primitive
              object={robot} // pass URDF robot object into the scene
              onPointerDown={handlePointerDown} // execute on joint clicks
              onPointerOver={onPointerOver} // execute on hover over
              onPointerOut={onPointerOut} // execute on hover out
            />
          )}
        </>
      </Canvas>
    </div>
  );
};

export default RobotBuilder;
