import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import Files from "./components/Files";
import Text from "./components/Text";
import Login from "./components/Login";
import RequireRoom from "./components/RequireRoom";
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
          {/* Home is public; the tabs below belong to a room. */}
          <Route path="/" element={<Page />} />
          <Route
            path="/files"
            element={
              <RequireRoom>
                <Files />
              </RequireRoom>
            }
          />
          <Route
            path="/text"
            element={
              <RequireRoom>
                <Text />
              </RequireRoom>
            }
          />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
