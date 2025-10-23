/**
 * Description: Server logic for Evaluating Human-Centered XAI-Assisted Decision Making
 *
 * Author: V Natarjan
 */

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// From server/server.js the project root is one level above
const project_root = "../";
const app = express();
const db_path = path.join(__dirname, '../../database/database.db');
const PORT = 7000;
const client_ui_web_pages_location='client';
let db;

// Initialize the server and database
function init() {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, project_root, client_ui_web_pages_location)));
    db_init();
}

function start_http_server(port) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}?participant_id=123&study_id=456`);
    });
}

function db_create_or_open()
{
    // Create or open the database
    db = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Database opened (or created if not existing) successfully.');
    }

    });

    //Other files can access it
    module.exports = db;
}

function db_table_init()
{
    // Create table if it doesn't exist
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS participant_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id TEXT NOT NULL,
        study_id INTEGER NOT NULL,
        xray_image TEXT NOT NULL,
        participant_diagnosis TEXT NOT NULL,
        page_nr INTEGER NOT NULL
    )`);
    });
}

function db_init()
{
    db_create_or_open();
    db_table_init();
}

// Register a POST route
function register_post_event(route, callback) {
    app.post(route, (req, res) => {
        callback(req, res);
    });
}

// Register a GET route
function register_get_event(route, callback) {
    app.get(route, (req, res) => {
        callback(req, res);
    });
}

/*
function cb_event_write_db(req, res)
{
    const { participant_id,study_id,xray_image,participant_diagnosis, page_nr} = req.body;
    console.log(`Saving to database: participant_id=${participant_id}, study_id=${study_id}, xray_image=${xray_image}, participant_diagnosis=${participant_diagnosis}, page_nr=${page_nr}`);

    let p_diagnosis = (participant_diagnosis === "healthy") ? "Healthy" : "OCDegen";

    db.run(`INSERT INTO participant_feedback (participant_id, study_id, xray_image, participant_diagnosis, page_nr) VALUES (?, ?, ?, ?, ?)`, [participant_id, study_id, xray_image, p_diagnosis, page_nr], (err) => {
        if (err) {
            return res.status(500).send('Error saving data');
        }
        res.json({ message: "Data stored successfully!" });
    });
}
*/

/* 1. Checks if an entry exists with the same participant_id, study_id, and page_nr
 * 2. If an entry exists  -> Updates participant_diagnosis and xray_image
 * 3. If no entry         -> Inserts a new record into the database
 */
function cb_event_write_db(req, res) {
    const { participant_id, study_id, xray_image, participant_diagnosis, page_nr } = req.body;

    console.log(`Checking database for existing entry: participant_id=${participant_id}, study_id=${study_id}, page_nr=${page_nr}`);

    let p_diagnosis = (participant_diagnosis === "healthy") ? "Healthy" : "OCDegen";

    // First, check if an entry already exists
    db.get(
        `SELECT * FROM participant_feedback WHERE study_id = ? AND participant_id = ? AND page_nr = ?`,
        [study_id, participant_id, page_nr],
        (err, row) => {
            if (err) {
                return res.status(500).send('Database error');
            }

            if (row) {
                // If entry exists, update it
                db.run(
                    `UPDATE participant_feedback
                     SET participant_diagnosis = ?, xray_image = ?
                     WHERE study_id = ? AND participant_id = ? AND page_nr = ?`,
                    [p_diagnosis, xray_image, study_id, participant_id, page_nr],
                    (updateErr) => {
                        if (updateErr) {
                            return res.status(500).send('Error updating data');
                        }
                        res.json({ message: "Data updated successfully!" });
                    }
                );
            } else {
                // If no existing entry, insert a new one
                db.run(
                    `INSERT INTO participant_feedback (participant_id, study_id, xray_image, participant_diagnosis, page_nr)
                     VALUES (?, ?, ?, ?, ?)`,
                    [participant_id, study_id, xray_image, p_diagnosis, page_nr],
                    (insertErr) => {
                        if (insertErr) {
                            return res.status(500).send('Error saving data');
                        }
                        res.json({ message: "Data stored successfully!" });
                    }
                );
            }
        }
    );
}


function cb_event_read_db(req, res) {
    db.all("SELECT * FROM participant_feedback", [], (err, rows) => {
        if (err) {
            console.error("Database Error:", err);
            res.status(500).json({ error: "Error reading data" });
            return;
        }
        res.json(rows);
    });
}

function cb_event_read_db_prev(req, res) {
    const { participant_id, study_id, page_nr } = req.query;

    console.log(`Checking database for existing entry: participant_id=${participant_id}, study_id=${study_id}, page_nr=${page_nr}`);
    const query = `SELECT * FROM participant_feedback WHERE participant_id = ? AND study_id = ? AND page_nr = ?`;

    const params = [participant_id, study_id, page_nr];

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Database Error:", err);
            res.status(500).json({ error: "Error reading data" });
            return;
        }
        console.error(rows);
        res.json(rows);
    });
}

function get_last_updated_page_nr(participant_id, study_id) {
    console.log(`Fetching last updated page_nr for: participant_id=${participant_id}, study_id=${study_id}`);

    const query = `SELECT MAX(page_nr) AS last_updated_page_nr FROM participant_feedback WHERE participant_id = ? AND study_id = ?`;

    return new Promise((resolve, reject) => {
        db.get(query, [participant_id, study_id], (err, row) => {
            if (err) {
                console.error("Database error: Fetching Last Updated Page Number", err);
                return reject(-1); // Handle DB error
            }
            resolve(row?.last_updated_page_nr ?? 1); // Default to 1 if no record found
        });
    });
}

function get_study_details(study_id) {
    console.log(`Fetching study details for: study_id=${study_id}`);

    const query = `SELECT study_id, study_type, total_pages FROM study WHERE study_id = ?`;

    return new Promise((resolve, reject) => {
        db.get(query, [study_id], (err, row) => {
            if (err) {
                console.error("Database error:", err);
                return reject({ study_type: -1, total_pages: -1 }); // Handle DB error
            }
            if (!row) {
                return reject({ study_type: -2, total_pages: -2 }); // Handle missing record
            }
            resolve({ study_type: parseInt(row.study_type), total_pages: parseInt(row.total_pages) });
        });
    });
}

async function cb_event_db_validation_participant_id_and_study_id(req, res) {
    const { participant_id, study_id } = req.body; // Get both participant_id and study_id from the request body
    console.log(`[ CLIENT REQUEST ] Submit Participant ID: ${encodeURIComponent(participant_id)}`);
    console.log(`[ CLIENT REQUEST ] Submit Study ID: ${encodeURIComponent(study_id)}`);

    try {
        const { study_type, total_pages } = await get_study_details(parseInt(study_id));

        if (study_type === -1) {
            return res.status(500).json({ error: "DB Error or study table does not exist" });
        } else if (study_type === -2) {
            return res.status(404).json({ error: "Record with study_id does not exist in the study table" });
        }

        const last_updated_page_nr = await get_last_updated_page_nr(participant_id, study_id);

        if (last_updated_page_nr === -1) {
            console.log("DB Error fetching last updated page number");
            last_updated_page_nr = 1;
        }

        res.json({ participant_id, study_id, study_type, last_updated_page_nr, total_pages });
    } catch (error) {
        console.error("Unexpected server error:", error);
        res.status(500).json({ error: "Unexpected server error" });
    }
}


/*
function cb_event_get_last_updated_page_nr(req, res) {
    const { participant_id, study_id } = req.query;

    console.log(`Fetching last updated page_nr for: participant_id=${participant_id}, study_id=${study_id}`);

    const query = `SELECT MAX(page_nr) AS last_updated_page_nr FROM participant_feedback WHERE participant_id = ? AND study_id = ?`;

    db.get(query, [participant_id, study_id], (err, row) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Error retrieving last updated page number" });
        }
        res.json({ last_updated_page_nr: row?.last_updated_page_nr ?? 1 }); // Return last updated page or 1 if no records [ the study page starts with page 1]
    });
}
*/
/*
function cb_event_get_study_details(req, res) {
    const { study_id } = req.query;

    console.log(`Fetching study details for: study_id=${study_id}`);

    const query = `SELECT study_id, study_type, total_pages FROM study WHERE study_id = ?`;

    db.get(query, [study_id], (err, row) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error retrieving study details" });
        }
        if (!row) {
            return res.status(404).json({ error: "Study table not created or record not available" });
        }
        res.json(row);
    });
}
*/

// Mock API endpoints for evidence and visualizations
function cb_event_get_evidence(req, res) {
    const { diagnosis, patientId } = req.query;
    
    console.log(`[EVIDENCE API] Request received - diagnosis: ${diagnosis}, patient: ${patientId}`);
    console.log(`[EVIDENCE API] Full query params:`, req.query);
    
    // Mock evidence data based on diagnosis severity
    let mockEvidence = {};
    
    switch(diagnosis) {
        case 'healthy':
            mockEvidence = {
                evidenceFor: [
                    { concept: "Normal Bone Density", importance: 0.88, description: "Bone density within healthy range for age" },
                    { concept: "Proper Joint Alignment", importance: 0.85, description: "All joints show correct alignment and spacing" },
                    { concept: "Strong Cortical Structure", importance: 0.82, description: "Cortical bone shows excellent structural integrity" },
                    { concept: "No Degeneration Signs", importance: 0.79, description: "No visible signs of bone degeneration detected" }
                ],
                evidenceAgainst: [
                    { concept: "Minor Imaging Artifacts", importance: 0.25, description: "Some minor artifacts present in imaging" },
                    { concept: "Natural Variation", importance: 0.18, description: "Slight natural anatomical variations" }
                ]
            };
            break;
            
        case 'mild':
            mockEvidence = {
                evidenceFor: [
                    { concept: "Early Bone Changes", importance: 0.65, description: "Very early signs of bone structure changes" },
                    { concept: "Minor Density Reduction", importance: 0.58, description: "Slight reduction in bone density detected" },
                    { concept: "Subtle Joint Narrowing", importance: 0.52, description: "Minimal joint space narrowing observed" }
                ],
                evidenceAgainst: [
                    { concept: "Mostly Normal Structure", importance: 0.72, description: "Most bone structure remains normal" },
                    { concept: "Good Joint Function", importance: 0.68, description: "Joint functionality appears preserved" },
                    { concept: "Adequate Cortical Thickness", importance: 0.61, description: "Cortical bone thickness still adequate" }
                ]
            };
            break;
            
        case 'moderate':
            mockEvidence = {
                evidenceFor: [
                    { concept: "Noticeable Bone Loss", importance: 0.78, description: "Clear evidence of bone density loss" },
                    { concept: "Joint Space Reduction", importance: 0.75, description: "Moderate reduction in joint spacing" },
                    { concept: "Cortical Thinning", importance: 0.71, description: "Visible thinning of cortical bone" },
                    { concept: "Structural Weakening", importance: 0.68, description: "Signs of structural weakening present" }
                ],
                evidenceAgainst: [
                    { concept: "Partial Preservation", importance: 0.52, description: "Some areas show preserved structure" },
                    { concept: "Treatable Stage", importance: 0.48, description: "Condition appears treatable at this stage" }
                ]
            };
            break;
            
        case 'severe':
            mockEvidence = {
                evidenceFor: [
                    { concept: "Significant Degeneration", importance: 0.89, description: "Severe bone degeneration clearly visible" },
                    { concept: "Major Joint Damage", importance: 0.86, description: "Substantial joint space loss and damage" },
                    { concept: "Advanced Thinning", importance: 0.83, description: "Advanced cortical bone thinning" },
                    { concept: "Structural Compromise", importance: 0.81, description: "Major structural compromise evident" },
                    { concept: "Multiple Biomarkers", importance: 0.78, description: "Multiple OCDegen biomarkers present" }
                ],
                evidenceAgainst: [
                    { concept: "Small Healthy Regions", importance: 0.32, description: "Very small regions show healthier tissue" },
                    { concept: "Treatment Possibility", importance: 0.28, description: "Aggressive treatment may still help" }
                ]
            };
            break;
            
        case 'unhealthy':
        default:
            mockEvidence = {
                evidenceFor: [
                    { concept: "Critical Bone Degeneration", importance: 0.95, description: "Severe and extensive bone deterioration" },
                    { concept: "Complete Joint Collapse", importance: 0.92, description: "Near-complete loss of joint structure" },
                    { concept: "Extreme Cortical Loss", importance: 0.91, description: "Extreme thinning or loss of cortical bone" },
                    { concept: "Advanced Disease Stage", importance: 0.89, description: "All markers indicate advanced disease" },
                    { concept: "Systemic Involvement", importance: 0.87, description: "Multiple bone systems affected" },
                    { concept: "Irreversible Damage", importance: 0.84, description: "Evidence suggests irreversible damage" }
                ],
                evidenceAgainst: [
                    { concept: "Minimal Preservation", importance: 0.18, description: "Extremely limited healthy tissue remains" },
                    { concept: "Late Detection", importance: 0.15, description: "Disease detected at very late stage" }
                ]
            };
            break;
    }
    
    console.log(`[EVIDENCE API] Sending response for ${diagnosis}:`, mockEvidence);
    res.json(mockEvidence);
}

function cb_event_get_heatmap(req, res) {
    const { imageId } = req.params;
    const { concept, patientId, diagnosis } = req.query;
    
    console.log(`Fetching heatmap - concept: ${concept}, patient: ${patientId}, diagnosis: ${diagnosis}`);
    
    // Generate heatmap path based on concept
    // In production, this would dynamically generate or retrieve the actual heatmap
    const conceptSlug = concept ? concept.toLowerCase().replace(/\s+/g, '_') : 'default';
    const heatmapPath = `/visualizations/patient_${patientId || 'default'}/heatmap_${conceptSlug}.png`;
    
    res.json({
        success: true,
        concept: concept,
        imagePath: heatmapPath,
        fallbackPath: `/visualizations/placeholder_heatmap.png`
    });
}

function cb_event_get_patient_visualizations(req, res) {
    const { patientId } = req.params;
    
    console.log(`[VISUALIZATIONS API] Fetching visualizations for patient: ${patientId}`);
    
    // Mock data based on available patient folders
    const availablePatients = {
        'patient_35': {
            heatmaps: [
                { id: 1, name: 'Feature Importance Heatmap', url: '/visualizations/patient_35/heatmap_1.png' },
                { id: 2, name: 'Regional Analysis Heatmap', url: '/visualizations/patient_35/heatmap_2.png' },
                { id: 3, name: 'Bone Structure Heatmap', url: '/visualizations/patient_35/heatmap_3.png' },
                { id: 4, name: 'Overall Confidence Heatmap', url: '/visualizations/patient_35/heatmap_4.png' }
            ],
            waterfall: { url: '/visualizations/patient_35/waterfall.png', name: 'SHAP Waterfall Plot' }
        },
        'patient_9': {
            heatmaps: [
                { id: 1, name: 'Feature Importance Heatmap', url: '/visualizations/patient_9/heatmap_1.png' },
                { id: 2, name: 'Regional Analysis Heatmap', url: '/visualizations/patient_9/heatmap_2.png' },
                { id: 3, name: 'Bone Structure Heatmap', url: '/visualizations/patient_9/heatmap_3.png' },
                { id: 4, name: 'Overall Confidence Heatmap', url: '/visualizations/patient_9/heatmap_4.png' }
            ],
            waterfall: { url: '/visualizations/patient_9/waterfall.png', name: 'SHAP Waterfall Plot' }
        },
        'patient_3': {
            heatmaps: [],
            waterfall: null
        }
    };
    
    // Default response for unknown patients or patients without data
    const defaultResponse = {
        heatmaps: [
            { id: 1, name: 'Sample Feature Heatmap', url: '/visualizations/sample_heatmap_1.png', isMock: true },
            { id: 2, name: 'Sample Analysis Heatmap', url: '/visualizations/sample_heatmap_2.png', isMock: true }
        ],
        waterfall: { url: '/visualizations/sample_waterfall.png', name: 'Sample Waterfall Plot', isMock: true }
    };
    
    const patientKey = `patient_${patientId}`;
    const visualizations = availablePatients[patientKey] || defaultResponse;
    
    console.log(`[VISUALIZATIONS API] Sending visualizations for ${patientId}:`, visualizations);
    res.json(visualizations);
}

init();
register_post_event("/db_validation_participant_id_and_study_id", cb_event_db_validation_participant_id_and_study_id);
register_post_event("/write_db", cb_event_write_db);
register_get_event("/read_db", cb_event_read_db);
register_get_event("/read_db_prev", cb_event_read_db_prev);

// Simple test endpoint
function cb_event_test_api(req, res) {
    res.json({ message: "API is working!", timestamp: new Date().toISOString() });
}

// Register mock API endpoints
register_get_event("/api/test", cb_event_test_api);
register_get_event("/api/evidence", cb_event_get_evidence);
register_get_event("/api/heatmap", cb_event_get_heatmap);
register_get_event("/api/visualizations/:patientId", cb_event_get_patient_visualizations);

//register_get_event("/read_db_get_last_updated_page_nr", cb_event_get_last_updated_page_nr);
//register_get_event("/read_db_get_study_details", cb_event_get_study_details);

start_http_server(PORT);
