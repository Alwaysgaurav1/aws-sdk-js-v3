# AWS SDK AbortSignal Leak Demonstration

This project demonstrates the infamous `AbortSignal` memory leak that affected high-throughput client polling operations (e.g., SQS) in early versions of the AWS SDK for JavaScript v3.

## The Bug Context

To allow requests to be aborted dynamically, the AWS SDK attaches an event listener to the `AbortSignal` associated with a request:
```js
abortSignal.addEventListener('abort', abortHandler);
```
However, the SDK forgot to clean up this listener when requests completed successfully. Since SQS polling runs in a continuous loop using a shared/persistent configuration or signal, these listeners accumulated on the signal object forever.

After 10 requests, Node.js outputs a warning:
```
MaxListenersExceededWarning: Possible EventTarget memory leak detected. 11 abort listeners added to [AbortSignal].
```
If the script runs for a long time, it eventually crashes the Node.js process with an Out of Memory (OOM) exception.

## Project Structure

- `leak_demo.js`: Emulates the buggy AWS SDK behavior showing the listener count growing dynamically.
- `fix_demo.js`: Shows the corrected implementation with `removeEventListener` cleanups.

## How to Run

1. Run the leak demonstration:
   ```bash
   npm run demo:leak
   ```
   *Observe:* The listener count climbs up by 1 with each request, surpassing the default warning limit of 10.

2. Run the fixed version:
   ```bash
   npm run demo:fix
   ```
   *Observe:* The listener count remains at `0` after each request completes, indicating a completely stable memory footprint.
