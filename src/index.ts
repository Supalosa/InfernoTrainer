"use strict";

import React from "react";
import { createRoot } from "react-dom/client";
import { ColosseumApp } from "./ColosseumApp";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(React.createElement(ColosseumApp));
