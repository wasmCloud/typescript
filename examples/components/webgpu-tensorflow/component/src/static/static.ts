import index_html from "./index.html";
import styles_css from "./styles.css";
import script_js from "./script.js";
import content_statue_of_liberty_jpg from "./images/content/statue-of-liberty.jpg";
import content_lincoln_memorial_illuminated_jpg from "./images/content/lincoln-memorial-illuminated.jpg";
import style_cartoon_jpg from "./images/style/cartoon.jpg";
import style_pen_and_ink_jpg from "./images/style/pen-and-ink.jpg";

export default {
  "/": index_html,
  "/styles.css": styles_css,
  "/script.js": script_js,
  "/images/content/statue-of-liberty.jpg": content_statue_of_liberty_jpg,
  "/images/content/lincoln-memorial-illuminated.jpg": content_lincoln_memorial_illuminated_jpg,
  "/images/style/cartoon.jpg": style_cartoon_jpg,
  "/images/style/pen-and-ink.jpg": style_pen_and_ink_jpg,
} as Record<string, string>;
