// Track event listeners globally to show the fix works
let activeAbortListeners = 0;
const originalAdd = AbortSignal.prototype.addEventListener;
const originalRemove = AbortSignal.prototype.removeEventListener;

AbortSignal.prototype.addEventListener = function (type, listener, options) {
  if (type === 'abort') {
    activeAbortListeners++;
  }
  return originalAdd.call(this, type, listener, options);
};

AbortSignal.prototype.removeEventListener = function (type, listener, options) {
  if (type === 'abort') {
    activeAbortListeners--;
  }
  return originalRemove.call(this, type, listener, options);
};

// Fixed AWS SDK Request function
async function runMockSDKRequestFixed(abortSignal) {
  return new Promise((resolve, reject) => {
    let abortHandler;

    const cleanup = () => {
      if (abortSignal && abortHandler) {
        // ALWAYS remove the listener to prevent memory leaks!
        abortSignal.removeEventListener('abort', abortHandler);
      }
    };

    if (abortSignal) {
      abortHandler = () => {
        cleanup();
        reject(new Error("Request aborted"));
      };
      abortSignal.addEventListener('abort', abortHandler);
    }

    // Emulate a successful network request resolving after 50ms
    setTimeout(() => {
      cleanup(); // ALWAYS cleanup before resolving
      resolve({ statusCode: 200, body: "Success" });
    }, 50);
  });
}

async function main() {
  console.log("=== Starting AWS SDK AbortSignal Fixed Demo ===");
  console.log("This script simulates polling SQS/S3 with proper event listener cleanup.");

  const controller = new AbortController();
  const signal = controller.signal;

  // Let's perform 15 simulated polling requests
  for (let i = 1; i <= 15; i++) {
    await runMockSDKRequestFixed(signal);
    console.log(`Poll #${i} finished. Active 'abort' listeners on AbortSignal: ${activeAbortListeners}`);
  }

  console.log("\nNotice that the number of active listeners remains stable at 0 after each request completed.");
  console.log("This completely eliminates the MaxListenersExceededWarning and memory leak!");
}

main().catch(console.error);
