const { WebSocketServer } = require("ws");
const { server: stellarServer } = require("./config/stellar");

/**
 * Sets up the WebSocket server attached to the existing HTTP server.
 *
 * @param {import("http").Server} server - The HTTP server instance.
 * @returns {import("ws").Server} The WebSocket server instance.
 */
function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    // Handle path-based routing specifically for /stream/ledgers
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/stream/ledgers") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    console.log(`[WebSocket] Client connected to /stream/ledgers from ${req.socket.remoteAddress}`);

    let isClosed = false;
    let closeHorizonStream;

    try {
      // Subscribe to Horizon live ledger stream
      closeHorizonStream = stellarServer.ledgers().stream({
        onmessage: (ledger) => {
          if (isClosed) return;
          try {
            // Transform raw Horizon ledger structure into desired JSON schema
            const payload = JSON.stringify({
              sequence: ledger.sequence,
              closedAt: ledger.closed_at,
              baseFee: ledger.base_fee_in_stroops,
              transactionCount: ledger.successful_transaction_count,
            });

            if (ws.readyState === ws.OPEN) {
              ws.send(payload);
            }
          } catch (err) {
            console.error("[WebSocket] Error formatting or sending ledger update:", err);
          }
        },
        onerror: (error) => {
          // Safely catch and log stream errors without crashing the server process
          console.error("[WebSocket] Stellar Horizon ledger stream error:", error);
        },
      });
    } catch (err) {
      console.error("[WebSocket] Failed to start Stellar Horizon stream:", err);
      ws.close(1011, "Horizon stream subscription failed");
      return;
    }

    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      console.log("[WebSocket] Client disconnected from /stream/ledgers. Unsubscribing Horizon stream.");
      if (typeof closeHorizonStream === "function") {
        try {
          closeHorizonStream();
        } catch (err) {
          console.error("[WebSocket] Error unsubscribing from Horizon stream:", err);
        }
      }
    };

    ws.on("close", cleanup);
    ws.on("error", (err) => {
      console.error("[WebSocket] Client socket error:", err);
      cleanup();
    });
  });

  return wss;
}

module.exports = { setupWebSocket };
