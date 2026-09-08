import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const theme = createTheme({
  typography: { fontFamily: '"Source Sans 3", sans-serif' },
  palette: {
    primary: { main: "#ae321f" },
    background: { default: "#faf9f5", paper: "#faf9f5" },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
