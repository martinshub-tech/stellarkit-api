/**
 * ws-client-demo.js
 * A simple client script to verify the end-to-end WebSocket streaming output of the StellarKit API.
 *
 * To run this script:
 * 1. Start the server in one terminal: npm run dev (or node src/index.js)
 * 2. Run this script in another terminal: node scripts/ws-client-demo.js
 */

const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wsUrl = `ws://localhost:${PORT}/stream/ledgers`;

console.log(`Connecting to StellarKit WebSocket ledger stream at: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on("open", () => {
  console.log("✅ Connected successfully! Listening for real-time ledger updates...\n");
});

ws.on("message", (data) => {
  try {
    const ledger = JSON.parse(data.toString());
    console.log("🔔 [Live Ledger Received]");
    console.log(`   Sequence         : ${ledger.sequence}`);
    console.log(`   Closed At        : ${ledger.closedAt}`);
    console.log(`   Base Fee         : ${ledger.baseFee} stroops`);
    console.log(`   Transaction Count: ${ledger.transactionCount}`);
    console.log("   -------------------------------------------------");
  } catch (err) {
    console.error("❌ Failed to parse incoming ledger event:", err.message);
  }
});

ws.on("error", (err) => {
  console.error("❌ WebSocket Client Error:", err.message);
});

ws.on("close", (code, reason) => {
  console.log(`\n🔌 Connection closed by server (Code: ${code}, Reason: ${reason || "None"})`);
  process.exit(0);
});

// Auto-terminate client after 3 minutes of inactivity/monitoring to prevent orphaned processes
setTimeout(() => {
  console.log("\n⏰ Demo timeout reached (3 minutes). Closing connection.");
  ws.close();
}, 180000);
