import React from "react";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import Files from "./components/Files";
import Text from "./components/Text";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Page from "./components/Page";

const App = () => {
  return (
<div className="container mt-4">
  <Router>
    <Routes>
    <Route path="/" element={<>
      <h1 className="text-center">Welcome to SHAREit</h1>
      <Page /></>
    } />
    <Route path="/files" element={<Files />} />
    <Route path="/text" element={<Text />} />
    </Routes>
  </Router>
</div>

  );
}
export default App;
