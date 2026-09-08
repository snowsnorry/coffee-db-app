import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "./api/health";

type ApiStatus = "loading" | "ready" | "unavailable";

const STATUS_COPY: Record<ApiStatus, string> = {
  loading: "Checking API connection…",
  ready: "UI and API are ready.",
  unavailable: "The UI is running, but the API is unavailable.",
};

export default function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");

  const checkApi = useCallback(async (signal?: AbortSignal) => {
    setApiStatus("loading");
    try {
      await fetchHealth(signal);
      setApiStatus("ready");
    } catch {
      if (!signal?.aborted) {
        setApiStatus("unavailable");
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void checkApi(controller.signal);
    return () => controller.abort();
  }, [checkApi]);

  const isLoading = apiStatus === "loading";
  const statusSeverity = apiStatus === "ready" ? "success" : "error";

  return (
    <Box
      component="main"
      className="min-h-screen"
      sx={{ display: "grid", placeItems: "center", py: 4 }}
    >
      <Container maxWidth="sm">
        <Paper component="section" elevation={0} sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography component="h1" variant="h3" gutterBottom>
                Coffee DB
              </Typography>
              <Typography color="text.secondary">
                A catalogue of coffee roasters and coffee products is taking
                shape.
              </Typography>
            </Box>

            {isLoading ? (
              <Stack
                direction="row"
                spacing={1.5}
                role="status"
                sx={{ alignItems: "center" }}
              >
                <CircularProgress size={20} aria-hidden="true" />
                <Typography>{STATUS_COPY.loading}</Typography>
              </Stack>
            ) : (
              <Alert severity={statusSeverity}>{STATUS_COPY[apiStatus]}</Alert>
            )}

            <Button
              variant="outlined"
              onClick={() => void checkApi()}
              disabled={isLoading}
              sx={{ alignSelf: "flex-start" }}
            >
              Check API again
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
