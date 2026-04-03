import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DebugApp from "./DebugApp";
import "./index.css";

const Component = window.location.hash === "#/debug" ? DebugApp : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);
