
// Track event listeners globally to show the leak clearly
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

// Emulated AWS SDK Request function that leaks listeners
async function runMockSDKRequest(abortSignal) {
  return new Promise((resolve) => {
    // 1. Check if abort signal is provided
    if (abortSignal) {
      // 2. Register abort listener to cancel the connection/request
      const abortHandler = () => {
        console.log("Request aborted!");
      };
      abortSignal.addEventListener('abort', abortHandler);
      
      // BUG: The SDK registers the listener but never removes it when the request completes successfully!
    }

    // Emulate a successful network request resolving after 50ms
    setTimeout(() => {
      resolve({ statusCode: 200, body: "Success" });
    }, 50);
  });
}

async function main() {
  console.log("=== Starting AWS SDK AbortSignal Leak Demo ===");
  console.log("This script simulates polling SQS/S3 using a shared AbortController, demonstrating the listener accumulation.");

  const controller = new AbortController();
  const signal = controller.signal;

  // Let's perform 15 simulated polling requests
  for (let i = 1; i <= 15; i++) {
    await runMockSDKRequest(signal);
    console.log(`Poll #${i} finished. Active 'abort' listeners on AbortSignal: ${activeAbortListeners}`);
  }

  console.log("\nNotice that the number of active listeners continues to grow with every request.");
  console.log("In modern Node.js, adding more than 10 listeners to an EventTarget triggers a MaxListenersExceededWarning.");
}

main().catch(console.error);
