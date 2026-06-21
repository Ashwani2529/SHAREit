import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import Files from "./components/Files";
import Private from "./components/Private";
import Text from "./components/Text";
import Login from "./components/Login";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Page from "./components/Page";


const App = () => {
  return (
    <div className="app-container">
      <ToastContainer
        position="bottom-right"
        autoClose={2500}
        theme="dark"
        newestOnTop
      />
      <Router>
        <Routes>
          <Route path="/" element={<Page />} />
          <Route path="/files" element={<Files />} />
          <Route path="/text" element={<Text />} />
          <Route
            path="/private"
            element={
              <Private />
            }
          />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
