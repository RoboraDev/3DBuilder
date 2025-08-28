import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import URDFLoader, { URDFRobot } from "urdf-loader";


const highlightColor = new THREE.Color('#ffff00');

// 🟢 RobotBuilder component
// Loads a URDF robot and allows:
//  1. Scaling with mouse scroll
//  2. Selecting joints by clicking
//  3. TODO: Dragging mouse left/right to move that joint
const RobotBuilder = ({ url }: { url: string }) => {
  // Reference to the whole robot group (Three.js object)
  const robotRef = useRef<THREE.Group>(null);

  // State to store the loaded robot object (from URDF)
  const [robot, setRobot] = useState<URDFRobot| null>(null);

  // --- Dragging logic state ---
  // Which joint is currently selected (by clicking)?
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);

  // Are we currently dragging the mouse to rotate a joint?
  const [isDragging, setIsDragging] = useState(false);

  // Last recorded mouse X position (used to measure mouse movement delta)
  const lastMouseX = useRef(0);

  const findURDJointFromObject = (startObj: THREE.Object3D): THREE.Object3D | null => {
  let current: THREE.Object3D | null = startObj;

  while (current) {
    if (current.type === "URDFJoint") {
      return current;
    }
    current = current.parent;
  }

  return null;
}

  // 🚀 Load the URDF model once (when "url" changes)
  useEffect(() => {
    const loader = new URDFLoader();

    loader.load(
      url,
      (urdf) => {
        // Robot successfully loaded
        urdf.name = "robot"; // assign a name (optional, but good for debugging)
        urdf.rotation.set(0, 0, 0); // ensure initial orientation is reset
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

  // 🖱️ Mouse move → while dragging, rotate the selected joint
  const onPointerOver = (e: any) => {
    e.stopPropagation(); 
    e.object.currentHex = e.object.material.color.getHex();
    e.object.material.color.set(highlightColor);
  };

  const onPointerOut = (e: any) => {
    e.stopPropagation(); 
    if (e.object.currentHex !== undefined) {
      e.object.material.color.set(e.object.currentHex);
    }    
  };

  // 🖱️ Mouse down → check if we clicked on a joint
  const handlePointerDown = (e: any) => {
    e.stopPropagation(); // prevent event bubbling

    if (robot) {
      // If that mesh corresponds to a real joint in the robot
      const joint = findURDJointFromObject(e.object);
      if (joint) {
        setSelectedJoint(joint.name); // save joint name
        setIsDragging(true); // enter dragging mode
        lastMouseX.current = e.clientX; // store where the drag started
      }
    }
  };

  // 🖱️ Mouse move → while dragging, rotate the selected joint
  const handlePointerMove = (e: MouseEvent) => {
    // TODO: implement joint rotation correctly
    if (isDragging && robot && selectedJoint) {
      // Calculate horizontal movement since last frame
      const dx = e.clientX - lastMouseX.current;

      // Update "last" position for next frame
      lastMouseX.current = e.clientX;

      // Get current joint value (rotation in radians)
      const currentValue = robot.joints[selectedJoint].jointValue[0] || 0;

      // Add a small increment proportional to mouse movement
      // dx * 0.01 = sensitivity factor (smaller = slower rotation)
      const newValue = currentValue + dx * 0.01;

      // Apply new joint angle to the robot
      robot.setJointValue(selectedJoint, newValue);
    }
  };

  // 🖱️ Mouse up → stop dragging
  const handlePointerUp = () => {
    setIsDragging(false);
    setSelectedJoint(null);
  };

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
    <>
      {/* Render robot when loaded */}
      {robot && (
        <primitive
          ref={robotRef} // reference to the root group
          object={robot} // pass URDF robot object into the scene
          onPointerDown={handlePointerDown} // detect clicks on joints
          onPointerOver={onPointerOver} // execute on hover
          onPointerOut={onPointerOut} // execute on hover out
        />
      )}
    </>
  );
};

// 🟢 Scene wrapper component
// Creates a full 3D canvas and inserts RobotBuilder inside
const RobotScene = () => {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Canvas camera={{ position: [2, 2, 2], fov: 50 }} gl={{ antialias: true }}>
        <color attach="background" args={["#e4ebd3"]} />
        
        <ambientLight intensity={0.3} /> {/* soft global light */}
        <directionalLight position={[5, 10, 5]} intensity={1.5} /> {/* directional light */}
        
        {/* Camera controls: rotate, pan, zoom around scene */}
        <OrbitControls zoomSpeed={5} rotateSpeed={2} minDistance={1} maxDistance={10} enableDamping={false}/>

        {/* Load the robot URDF file into our RobotBuilder */}
        <RobotBuilder url="/urdf/cassie/cassie.urdf" />
      </Canvas>
    </div>
  );
};

export default RobotScene;
