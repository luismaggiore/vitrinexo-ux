import React from "react";
import { createRoot } from "react-dom/client";
import MemberGrid from "./components-react/MemberGrid";
import "./style.css";

const membersRoot = document.getElementById("members-root");

if (membersRoot) {
  createRoot(membersRoot).render(<MemberGrid />);
}
