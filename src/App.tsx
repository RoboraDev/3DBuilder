import './App.css';
import RobotBuilder from './components/RobotBuilder';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {/* Load the robot URDF file into our RobotBuilder */}
        <RobotBuilder url="/urdf/cassie/cassie.urdf"/>
      </header>
    </div>
  );
}

export default App;
