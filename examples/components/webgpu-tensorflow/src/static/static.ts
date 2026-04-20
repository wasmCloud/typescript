import index_html from "./index.html";
import styles_css from "./styles.css";
import script_js from "./script.js";

export default {
  "/index.html": index_html,
  "/styles.css": styles_css,
  "/script.js": script_js,
} as const as Record<string, string>;
