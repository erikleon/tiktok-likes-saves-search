const command = process.argv[2];

async function main() {
  switch (command) {
    case "request": {
      const { requestExport } = await import("./automation/request-export");
      await requestExport();
      break;
    }
    case "download": {
      const { downloadExport } = await import("./automation/download-export");
      await downloadExport();
      break;
    }
    case "parse": {
      const { runParse } = await import("./parser/unzip");
      await runParse();
      break;
    }
    case "serve": {
      const { startServer } = await import("./server/server");
      startServer();
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Usage: npm run [request|download|parse|serve]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
