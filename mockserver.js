const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.get('/api/heatmap/:imageId', (req, res) => {
  const { imageId } = req.params;
  res.json({
    imageId,
    heatmap: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
  });
});

app.post('/api/evidences', (req, res) => {
  const { hypothesis } = req.body;
  let evidences;
  if (hypothesis === 'A') {
    evidences = {
      for: ['Strong shadow in upper lobe', 'High opacity'],
      against: ['No pleural effusion', 'Normal heart size']
    };
  } else if (hypothesis === 'B') {
    evidences = {
      for: ['Clear costophrenic angle', 'No consolidation'],
      against: ['Diffuse opacity', 'Blunted angle']
    };
  } else if (hypothesis === 'C') {
    evidences = {
      for: ['Increased vascular markings', 'Patchy infiltrates'],
      against: ['No cardiomegaly', 'No interstitial thickening']
    };
  } else if (hypothesis === 'D') {
    evidences = {
      for: ['Well-defined nodule', 'No calcification'],
      against: ['Multiple nodules absent', 'No lymphadenopathy']
    };
  } else if (hypothesis === 'E') {
    evidences = {
      for: ['Diffuse reticular pattern', 'Honeycombing'],
      against: ['No pleural plaques', 'No volume loss']
    };
  } else {
    evidences = {
      for: ['General finding 1', 'General finding 2'],
      against: ['General counter 1', 'General counter 2']
    };
  }
  res.json({ hypothesis, evidences });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
});
