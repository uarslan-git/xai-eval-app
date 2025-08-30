const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");

const path = require("path");

app.use(cors());
app.use(express.json());

// Serve heatmap images statically from img/heatmaps at /heatmaps
app.use('/heatmaps', express.static(path.join(__dirname, 'img/heatmaps')));

// Endpoint to list all heatmap images
app.get('/api/heatmaps', (req, res) => {
  const dir = path.join(__dirname, 'img/heatmaps');
  fs.readdir(dir, (err, files) => {
    if (err) {
      res.status(500).json({ error: 'Could not list heatmap images' });
      return;
    }
    // Filter for image files only (png, jpg, jpeg, gif)
    const images = files.filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f));
    res.json({ images });
  });
});

app.get("/api/heatmap/:imageId", (req, res) => {
  const { imageId } = req.params;
  res.json({
    imageId,
    heatmap: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  });
});

// Diagnoses array with name, evidenceFor, evidenceAgainst
const diagnoses = [
  {
    name: "Healthy",
    evidenceFor: ["Clear lung fields", "Normal heart size"],
    evidenceAgainst: ["No abnormal shadows", "No effusion"],
  },
  {
    name: "Pneumonia",
    evidenceFor: ["Strong shadow in upper lobe", "High opacity"],
    evidenceAgainst: ["No pleural effusion", "Normal heart size"],
  },
  {
    name: "Pleural Effusion",
    evidenceFor: ["Clear costophrenic angle", "No consolidation"],
    evidenceAgainst: ["Diffuse opacity", "Blunted angle"],
  },
  {
    name: "Pulmonary Edema",
    evidenceFor: ["Increased vascular markings", "Patchy infiltrates"],
    evidenceAgainst: ["No cardiomegaly", "No interstitial thickening"],
  },
  {
    name: "Lung Nodule",
    evidenceFor: ["Well-defined nodule", "No calcification"],
    evidenceAgainst: ["Multiple nodules absent", "No lymphadenopathy"],
  },
  {
    name: "Interstitial Lung Disease",
    evidenceFor: ["Diffuse reticular pattern", "Honeycombing"],
    evidenceAgainst: ["No pleural plaques", "No volume loss"],
  },
];

app.get("/api/evidence/:diagnosis", (req, res) => {
  const { diagnosis } = req.params;
  const found = diagnoses.find((d) => d.name === diagnosis);

  // Generate more realistic mock base64 images for heatmap and waterfall
  const generateMockImage = () => {
    // This is a simple 1x1 pixel PNG in base64 - in real implementation, these would be actual visualizations
    const baseImage =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    return `data:image/png;base64,${baseImage}`;
  };

  const heatmap = generateMockImage();
  const waterfall = generateMockImage();

  if (found) {
    res.json({
      diagnosis: found.name,
      evidenceFor: found.evidenceFor,
      evidenceAgainst: found.evidenceAgainst,
      heatmap,
      waterfall,
    });
  } else {
    res.json({
      diagnosis: "Unknown",
      evidenceFor: ["General finding 1", "General finding 2"],
      evidenceAgainst: ["General counter 1", "General counter 2"],
      heatmap,
      waterfall,
    });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
});
