import React from "react";

import { createRoot } from "react-dom/client";
import MemberGrid from "./components-react/MemberGrid";
import MemberProfile from "./components-react/MemberProfile";
import { members } from "./data/members";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";
const membersRoot = document.getElementById("members-root");
const memberProfileDiv = document.getElementById("member-profile");

if (membersRoot) {
  createRoot(membersRoot).render(<MemberGrid />);
}

if (memberProfileDiv) {
  createRoot(memberProfileDiv).render(
    <MemberProfile key={members[5].name} {...members[5]} />,
  );
}
