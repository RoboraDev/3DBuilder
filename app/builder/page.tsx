"use client";

import RobotBuilder from "./components/RobotBuilder";

function Builder() {
  return (
    <div className="App">
      <header className="text-4xl text-center font-bold">3D Builder</header>
      {/* Load the robot URDF file into our RobotBuilder */}
      <RobotBuilder url="/urdf/cassie/cassie.urdf" />
    </div>
  );
}

export default Builder;
