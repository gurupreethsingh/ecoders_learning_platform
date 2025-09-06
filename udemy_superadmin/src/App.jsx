import "./App.css";
import "./styles/global.css";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./components/auth_components/AuthManager";
import MainLayout from "./components/common_components/MainLayout";
import TopArrow from "./components/common_components/TopArrow";

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout />
        <TopArrow scrollTargetId="app-scroll" />
      </Router>
    </AuthProvider>
  );
}

export default App;
