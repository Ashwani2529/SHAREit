import React from "react";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import Files from "./components/Files";
import Text from "./components/Text";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Page from "./components/Page";

const App = () => {
  return (
    <div className="app-container">
      <Router>
        <Routes>
          <Route path="/" element={<Page />} />
          <Route path="/files" element={<Files />} />
          <Route path="/text" element={<Text />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
