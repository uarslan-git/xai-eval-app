# XAI Eval App – Mockserver Demo Guide

## Features Demonstrated

- **Heatmaps on the frontend**: Visual overlays (image-based explanations) fetched from a mock endpoint.
- **Dynamic evidences**: Evidence for/against changes based on the selected hypothesis, using a mock API.

## Setup Instructions

1. **Install dependencies for the mock server:**
   ```sh
   npm install express cors
   ```

2. **Start the mock server:**
   ```sh
   node mockserver.js
   ```
   The server runs on `http://localhost:4000`.

3. **Frontend setup:**
   - Open the HTML files in `src/client/` (e.g., `index.html` or a study template) in your browser.
   - Make sure your frontend fetches from `http://localhost:4000/api/evidences` and `http://localhost:4000/api/heatmap/:imageId`.

## How to Demonstrate to Your Professor

- **Heatmaps:**
  - The frontend should display an image (e.g., X-ray) with a heatmap overlay.
  - The overlay is fetched from `/api/heatmap/:imageId` and shown as an `<img>` above the main image.

- **Dynamic Evidences:**
  - When you select a hypothesis (A, B, C, D, E), the frontend sends a POST to `/api/evidences` and updates the evidence for/against sections.
  - Try changing the hypothesis and observe the evidence lists update live.

## Example curl Commands

- Get a heatmap:
  ```sh
  curl http://localhost:4000/api/heatmap/123
  ```
- Get evidences for hypothesis C:
  ```sh
  curl -X POST http://localhost:4000/api/evidences -H "Content-Type: application/json" -d '{"hypothesis":"C"}'
  ```

## Notes
- The backend is mocked; no real data is processed.
- You can extend the mockserver.js for more endpoints or data as needed.

---

**To show your professor:**
- Open the frontend in a browser.
- Change hypotheses and see evidence update.
- Show the heatmap overlay on the image.
- Optionally, use curl to demonstrate the API responses.
