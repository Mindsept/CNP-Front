import { createRoot } from "react-dom/client";
import { SpaceBackground } from "./space-background";
const element = document.getElementById("cnp-space-root");
if (element) createRoot(element).render(<SpaceBackground />);
