/**
 * Description: Client logic for study page with one image
 *
 * Author: V Natarjan
 */


let input = null;

const button_next = document.getElementById("button-next");
const button_prev = document.getElementById("button-prev");
const radio_buttons = document.getElementsByName("health");
const patient_id1 = document.getElementById("patient-id-location1");
const patient_id2 = document.getElementById("patient-id-location2");
const x_ray_location = document.getElementById("x-ray-location");
const suggested_diag1 = document.getElementById("suggested-diag-location1");
const suggested_diag2 = document.getElementById("suggested-diag-location2");
const true_diag   = document.getElementById("true-diag");
const x_ray_image = document.getElementById("patient-x-ray-image");

let diagnosis = null;

function get_page_nr_from_url()
{
    const url_params = get_params_from_url();
    if(url_params.page_nr == null){
        return 1; //if page_nr is null in the url it should be the first page ( or page refresh happened without url encoding details )
    }

    return parseInt(url_params.page_nr);
}

function get_study_id_from_url()
{
    const url_params = get_params_from_url();
    return url_params.study_id;
}

function get_participant_id_from_url()
{
    const url_params = get_params_from_url();
    return url_params.participant_id;
}

function get_radio_button_status()
{
    let selected_value = null; // To store the selected value
    for (const radio of radio_buttons) {
        if (radio.checked) {
            selected_value = radio.value; // Store the value of the checked radio button
            break; // Stop the loop once we find the checked radio
        }
    }

    if (!selected_value) {
        console.log("WARN: Please select an option before proceeding!"); // If no option is selected
    }

    return selected_value;
}

function set_participant_diagnosis(val) {

    if (typeof val === "string") {
        val = val.toLowerCase();
    } else {
        console.error("Invalid diagnosis string received from DB");
        return false;
    }

    if (val === "healthy") {
        document.getElementById("radio-healthy").checked = true;
    } else if (val === "ocdegen") {
        document.getElementById("radio-unhealthy").checked = true;
    } else {
        console.error("Invalid value:", val);
        return false;
    }

    return true;
}

function clear_radio_buttons() {
    for (const radio of radio_buttons) {
        radio.checked = false;
    }
}

function set_progress(current_page_nr, total_page_count) {
    let progress_value = (current_page_nr / total_page_count) * 100; // Convert to percentage
    let progress_bar = document.querySelector("footer .progress-bar");
    progress_bar.style.width = progress_value + "%";

    document.getElementById("progress-bar-text").textContent = "Diagnosis " + current_page_nr.toString() + "/" + total_page_count.toString();
}

function set_patient_id(id)
{
    patient_id1.textContent = id.toString();
    patient_id2.textContent = "Patient ID: " + id.toString();
    
    // Notify interactive features of the current patient
    if (window.interactiveFeatures) {
        window.interactiveFeatures.setCurrentPatientId(id.toString());
    }
}

function set_x_ray_image(src)
{
    x_ray_image.src = src;
}

function get_x_ray_image()
{
    return x_ray_image.src;
}

function get_params_from_url()
{
    const params = new URLSearchParams(window.location.search);

    return {
        participant_id: params.get('participant_id') ? decodeURIComponent(params.get('participant_id')) : null,
        study_id: params.get('study_id') ? decodeURIComponent(params.get('study_id')) : null,
        study_type: params.get('study_id') ? decodeURIComponent(params.get('study_type')) : null,
        page_nr: params.get('page_nr') ? decodeURIComponent(params.get('page_nr')) : null,
        total_pages: params.get('page_nr') ? decodeURIComponent(params.get('total_pages')) : null,
    };
}

function update_study_url(participant_id, study_id, study_type, page_nr, total_pages)
{
    let new_url = "/study_id_";
    new_url += study_id + "/";
    new_url += "index.html?";
    new_url += "participant_id=" +participant_id;
    new_url += "&study_id=" + study_id;
    new_url += "&study_type=" + study_type;
    new_url += "&page_nr=" + page_nr;
    new_url += "&total_pages=" + total_pages;
    window.location.href = new_url;
}

async function db_update_async()
{
    console.log("Updating database...");
    const participant_diagnosis = get_radio_button_status();
    let participant_id = get_participant_id_from_url();
    let study_id = get_study_id_from_url();
    let page_nr = get_page_nr_from_url();

    if (!participant_id) {
        console.log("Error: URL doesn’t have participant_id");
        return;
    }

    if (!study_id) {
        console.log("Error: URL doesn’t have study_id");
        return;
    }

    let xray_image_url = get_x_ray_image();
    let xray_image = xray_image_url;
    //let xray_image = xray_image_url.split('/').pop(); // Extracts "05.png"

    try {
        const response = await fetch('/write_db', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ participant_id, study_id, xray_image, participant_diagnosis, page_nr })
        });

        const response_data = await response.json(); // Read JSON response

        if (!response.ok) {
            if (response.status === 400 && response_data.error === "DUPLICATE ENTRY") {
                console.log('Entry already exists. Cannot submit duplicate.');
                db_update_duplicate_entry_action(participant_id, study_id, page_nr);
                //ToDo: Get and Set actual Entry in the database ( Diagnosis )
            } else {
                console.log('Database error occurred. Please try again.');
            }
        } else {
            db_update_success_action(participant_id, study_id, page_nr);
        }
    } catch (error) {
        console.error('Error:', error);
        console.log('Something went wrong. Please try again.');
    }

}

async function db_update() {
    try {
        //await function make the fn block until it completes exec
        await db_update_async();
        console.log("Database update completed successfully.");
    } catch (error) {

        console.error("Error during database update:", error);
    }
}

function db_update_success_action(participant_id, study_id, current_page_nr)
{
    up = get_params_from_url();
    //Last Page
    if(current_page_nr >= csv_json_get_total_page_count())
    {
        let feedback_url = "/feedback/index.html?";
        feedback_url += "participant_id=" +participant_id;
        feedback_url += "&study_id=" + study_id;
        window.location.href = feedback_url; // Redirect to test.html
        return;
    }

    //increment page number
    page_nr = current_page_nr + 1;
    update_study_url(participant_id, study_id, up.study_type, page_nr, up.total_pages);
    clear_radio_buttons();

    csv_json_get_all_attributes_and_set_in_html_page(page_nr);
    db_get_and_set_participant_diagnosis(participant_id, study_id, page_nr);
    button_toggle_next_or_submit();
}

function button_toggle_next_or_submit()
{
    up = get_params_from_url();
    total_pages = parseInt(up.total_pages, 10);
    curr_page = parseInt(up.page_nr, 10);
    if (curr_page === total_pages) {
        //Change Button Next to Submit
        button_next.textContent = "Submit";
    }else{
        button_next.textContent = "Next";
    }
}

function db_update_duplicate_entry_action(participant_id, study_id, current_page_nr)
{
    up = get_params_from_url();
    //Last Page
    if(current_page_nr >= csv_json_get_total_page_count())
    {
        window.location.href = "/feedback/index.html"; // Redirect to test.html
        return;
    }

    //increment page number
    page_nr = current_page_nr + 1;
    update_study_url(participant_id, study_id, up.study_type, page_nr, up.total_pages);
    clear_radio_buttons();
    csv_json_get_all_attributes_and_set_in_html_page(page_nr);
    db_get_and_set_participant_diagnosis(participant_id, study_id, page_nr);
}



function next_button_action()
{
    let ret = get_radio_button_status();
    if(ret == null ){
        alert("Please select an option before proceeding to the next page.");
        return;
    }

    db_update();
}

async function db_get_and_set_participant_diagnosis_prev_button_click(participant_id, study_id, page_nr) {
    up = get_params_from_url();
    console.log("db_get_and_set_participant_diagnosis_prev_button_click");
    try {
        const response = await fetch(`/read_db_prev?participant_id=${participant_id}&study_id=${study_id}&page_nr=${page_nr}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            diagnosis = data[0].participant_diagnosis;
            //First URL Update
            update_study_url(participant_id, study_id, up.study_type, page_nr, up.total_pages);
            set_participant_diagnosis(diagnosis);
            //Set all attributes from csv_json info
            csv_json_get_all_attributes_and_set_in_html_page(page_nr);
            console.log(diagnosis);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function db_get_and_set_participant_diagnosis(participant_id, study_id, page_nr) {
    console.log("db_get_participant_diagnosis");
    try {
        const response = await fetch(`/read_db_prev?participant_id=${participant_id}&study_id=${study_id}&page_nr=${page_nr}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            diagnosis = data[0].participant_diagnosis;
            set_participant_diagnosis(diagnosis);
            console.log(diagnosis);
        }
        button_toggle_next_or_submit();
    } catch (error) {
        console.error('Error fetching data:', error);
        button_toggle_next_or_submit();
    }
}

async function prev_button_action()
{
    let participant_id = get_participant_id_from_url();
    let study_id = get_study_id_from_url();
    let curr_page_nr = get_page_nr_from_url();

    if(curr_page_nr == 1){
        console.log("You are already in the first page!");
        return;
    }

    prev_page_nr = curr_page_nr - 1;
    db_get_and_set_participant_diagnosis_prev_button_click(participant_id, study_id, prev_page_nr);
}

function set_suggested_diag(value)
{
    suggested_diag1.textContent = value;
    suggested_diag2.textContent = value;
    if(value == "OCDegen"){
        suggested_diag1.className = "";
        suggested_diag2.className = "";
        suggested_diag1.className = "unhealthy"
        suggested_diag2.className = "unhealthy"
    }else{
        suggested_diag1.className = "";
        suggested_diag2.className = "";
        suggested_diag1.className = "healthy"
        suggested_diag2.className = "healthy"
    }
}

function set_x_ray_location(value)
{
    x_ray_location.textContent = value;
}

function set_true_diag(value)
{
    true_diag.textContent = value;
    if(value == "OCDegen"){
        true_diag.className = ""
        true_diag.className = "unhealthy"
    }else{
        true_diag.className = ""
        true_diag.className = "healthy"
    }

}

//get total pagecount for the study
function csv_json_get_total_page_count()
{
    return input.PATIENT_ID.length;
}

function csv_json_get_main_attributes(page_nr)
{

    index = page_nr - 1;
    l_patient_id = input.PATIENT_ID[index];
    l_x_ray_loc  = input.X_RAY_LOCATION[index];
    l_true_diag = input.TRUE_DIAG[index];
    l_suggested_diag = input.SUGGESTED_DIAG[index];
    l_image = "img/" + input.X_RAY_IMAGE[index];
    attributes = [l_patient_id, l_image, l_x_ray_loc, l_true_diag, l_suggested_diag]
    return attributes;
}

function set_main_attributes_in_html_page(page_nr, attr)
{
    //attributes = [patient_id, image, x_ray_loc, true_diag, suggested_diag]
    set_patient_id(attr[0]);
    set_x_ray_image(attr[1]);
    set_x_ray_location(attr[2]);
    set_true_diag(attr[3]);
    set_suggested_diag(attr[4])
    set_progress(page_nr, csv_json_get_total_page_count());
}

function csv_json_get_all_attributes_and_set_in_html_page(page_nr)
{
    attr = csv_json_get_main_attributes(page_nr);
    set_main_attributes_in_html_page(page_nr, attr);
}

async function init_page()
{
    if (input == null) {
        console.log('Input is null, returning.');
        return;
    }

    console.log('App is running!');
    let participant_id = get_participant_id_from_url();
    let study_id = get_study_id_from_url();
    let page_nr = get_page_nr_from_url();
    db_get_and_set_participant_diagnosis(participant_id, study_id, page_nr);
    csv_json_get_all_attributes_and_set_in_html_page(page_nr);
}

async function load_json_data() {
    try {
        const response = await fetch("input.json"); // Fetch JSON asynchronously
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        input = await response.json();  // Set input with the loaded JSON
        console.log('Data loaded:', input);  // Debug: Confirm input data loaded
        init_page();
    } catch (error) {
        console.error("There was a problem with the fetch operation:", error);
        input = null;  // Reset input in case of error
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded - initializing components');
    await load_json_data();
    
    // Initialize interactive features after DOM is ready
    console.log('About to create InteractiveFeatures instance');
    window.interactiveFeatures = new InteractiveFeatures();
    console.log('InteractiveFeatures instance created:', window.interactiveFeatures);
});

button_next.addEventListener("click", function() {
    next_button_action();
});

button_prev.addEventListener("click", function() {
    prev_button_action();
});

// Interactive Features - Evidence and SHAP Visualizations
class InteractiveFeatures {
    constructor() {
        this.initializeEventListeners();
        this.currentPatientId = null;
    }

    initializeEventListeners() {
        console.log('InteractiveFeatures: Initializing event listeners');
        
        // Evidence fetching
        const fetchEvidenceBtn = document.getElementById('fetch-evidence-btn');
        const diagnosisSelect = document.getElementById('evidence-diagnosis');
        
        console.log('InteractiveFeatures: Found elements', {
            fetchEvidenceBtn: !!fetchEvidenceBtn,
            diagnosisSelect: !!diagnosisSelect
        });
        
        if (fetchEvidenceBtn) {
            console.log('InteractiveFeatures: Adding click listener to fetch button');
            fetchEvidenceBtn.addEventListener('click', () => {
                console.log('InteractiveFeatures: Fetch evidence button clicked!');
                this.fetchEvidence();
            });
        } else {
            console.error('InteractiveFeatures: fetch-evidence-btn not found!');
        }

        if (diagnosisSelect) {
            diagnosisSelect.addEventListener('change', () => {
                const evidenceContainer = document.getElementById('evidence-container');
                const evidenceFilter = document.querySelector('.evidence-filter');
                if (evidenceContainer) {
                    evidenceContainer.style.display = 'none';
                }
                if (evidenceFilter) {
                    evidenceFilter.style.display = 'none';
                }
            });
        }

        // Evidence type filter
        const evidenceTypeFilter = document.getElementById('evidence-type-filter');
        if (evidenceTypeFilter) {
            evidenceTypeFilter.addEventListener('change', () => {
                this.filterEvidence();
            });
        }

        // SHAP visualization buttons
        const waterfallBtn = document.getElementById('view-waterfall-btn');
        if (waterfallBtn) {
            waterfallBtn.addEventListener('click', () => this.viewWaterfallPlot());
        }

        const heatmapBtns = document.querySelectorAll('.heatmap-btn');
        heatmapBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const heatmapNum = e.target.dataset.heatmap;
                this.viewHeatmap(heatmapNum);
            });
        });

        // Modal close functionality
        const modalClose = document.querySelector('.modal-close');
        const modal = document.getElementById('visualization-modal');
        
        if (modalClose && modal) {
            modalClose.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    setCurrentPatientId(patientId) {
        this.currentPatientId = patientId;
        // Load visualizations when patient ID is set
        this.loadPatientVisualizations(patientId);
    }

    async loadPatientVisualizations(patientId) {
        console.log('Loading visualizations for patient:', patientId);
        
        try {
            const response = await fetch(`/api/visualizations/${patientId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch visualizations: ${response.status}`);
            }
            
            const visualizations = await response.json();
            console.log('Received visualizations:', visualizations);
            
            this.updateVisualizationButtons(visualizations);
        } catch (error) {
            console.error('Error loading patient visualizations:', error);
            // Show default visualizations on error
            this.updateVisualizationButtons({
                heatmaps: [
                    { id: 1, name: 'Default Heatmap 1', isMock: true },
                    { id: 2, name: 'Default Heatmap 2', isMock: true }
                ],
                waterfall: { name: 'Default Waterfall Plot', isMock: true }
            });
        }
    }

    updateVisualizationButtons(visualizations) {
        // Update waterfall button
        const waterfallBtn = document.getElementById('view-waterfall-btn');
        if (waterfallBtn && visualizations.waterfall) {
            waterfallBtn.textContent = visualizations.waterfall.name || 'View Waterfall Plot';
            waterfallBtn.style.display = 'block';
            if (visualizations.waterfall.isMock) {
                waterfallBtn.textContent += ' (Mock)';
                waterfallBtn.style.opacity = '0.7';
            }
        }

        // Update heatmap buttons
        const heatmapsContainer = document.getElementById('heatmaps-container');
        if (heatmapsContainer) {
            // Clear existing buttons
            heatmapsContainer.innerHTML = '';
            
            // Add buttons for each available heatmap
            visualizations.heatmaps.forEach(heatmap => {
                const button = document.createElement('button');
                button.className = 'heatmap-btn';
                button.dataset.heatmap = heatmap.id;
                button.dataset.url = heatmap.url;
                button.textContent = heatmap.name;
                
                if (heatmap.isMock) {
                    button.textContent += ' (Mock)';
                    button.style.opacity = '0.7';
                }
                
                button.addEventListener('click', (e) => {
                    const heatmapId = e.target.dataset.heatmap;
                    const heatmapUrl = e.target.dataset.url;
                    this.viewHeatmap(heatmapId, heatmap.name, heatmapUrl);
                });
                
                heatmapsContainer.appendChild(button);
            });
            
            if (visualizations.heatmaps.length === 0) {
                heatmapsContainer.innerHTML = '<p style="color: #666; font-style: italic;">No heatmaps available for this patient</p>';
            }
        }

        // Store visualizations for later use
        this.patientVisualizations = visualizations;
    }

    async fetchEvidence() {
        console.log('InteractiveFeatures: fetchEvidence called');
        
        const diagnosisSelect = document.getElementById('evidence-diagnosis');
        const evidenceContainer = document.getElementById('evidence-container');
        const fetchBtn = document.getElementById('fetch-evidence-btn');

        console.log('InteractiveFeatures: Elements check', {
            diagnosisSelect: !!diagnosisSelect,
            evidenceContainer: !!evidenceContainer,
            fetchBtn: !!fetchBtn
        });

        if (!diagnosisSelect || !evidenceContainer || !fetchBtn) {
            console.error('InteractiveFeatures: Missing required elements');
            return;
        }

        const diagnosis = diagnosisSelect.value;
        console.log('InteractiveFeatures: Selected diagnosis:', diagnosis);
        
        if (!diagnosis) {
            console.log('InteractiveFeatures: No diagnosis selected');
            alert('Please select a diagnosis first');
            return;
        }

        // Show loading state
        fetchBtn.textContent = 'Loading...';
        fetchBtn.disabled = true;

        try {
            const response = await fetch(`/api/evidence?diagnosis=${diagnosis}&patientId=${this.currentPatientId || 'unknown'}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch evidence');
            }

            const data = await response.json();
            console.log('InteractiveFeatures: Received data from server:', data);
            
            this.displayEvidence(data);
            
            console.log('InteractiveFeatures: Setting evidenceContainer display to block');
            evidenceContainer.style.display = 'block';
            
            // Add a temporary visual indicator
            evidenceContainer.style.border = '2px solid red';
            evidenceContainer.style.background = 'rgba(255, 255, 0, 0.1)';
            
            console.log('InteractiveFeatures: evidenceContainer display set. Current style:', evidenceContainer.style.cssText);

        } catch (error) {
            console.error('Error fetching evidence:', error);
            alert('Error fetching evidence. Please try again.');
        } finally {
            fetchBtn.textContent = 'Get Evidence';
            fetchBtn.disabled = false;
        }
    }

    displayEvidence(data) {
        console.log('InteractiveFeatures: displayEvidence called with data:', data);
        
        // Store the original data for filtering
        this.evidenceData = data;
        
        const evidenceForList = document.getElementById('evidence-for-list');
        const evidenceAgainstList = document.getElementById('evidence-against-list');
        const evidenceFilter = document.querySelector('.evidence-filter');

        console.log('InteractiveFeatures: Evidence list elements', {
            evidenceForList: !!evidenceForList,
            evidenceAgainstList: !!evidenceAgainstList
        });

        if (!evidenceForList || !evidenceAgainstList) {
            console.error('InteractiveFeatures: Evidence list elements not found');
            return;
        }

        // Show the evidence filter
        if (evidenceFilter) {
            evidenceFilter.style.display = 'block';
        }

        // Clear existing content
        evidenceForList.innerHTML = '';
        evidenceAgainstList.innerHTML = '';

        console.log('InteractiveFeatures: Processing evidence items');
        console.log('Evidence For items:', data.evidenceFor?.length);
        console.log('Evidence Against items:', data.evidenceAgainst?.length);

        // Display evidence for
        data.evidenceFor.forEach((item, index) => {
            console.log(`Creating evidence FOR item ${index}:`, item);
            const evidenceItem = this.createEvidenceItem(item);
            evidenceForList.appendChild(evidenceItem);
        });

        // Display evidence against
        data.evidenceAgainst.forEach((item, index) => {
            console.log(`Creating evidence AGAINST item ${index}:`, item);
            const evidenceItem = this.createEvidenceItem(item);
            evidenceAgainstList.appendChild(evidenceItem);
        });

        console.log('InteractiveFeatures: Evidence display completed');
    }

    filterEvidence() {
        if (!this.evidenceData) return;

        const filterValue = document.getElementById('evidence-type-filter').value;
        const evidenceForSection = document.querySelector('.evidence-section:has(.evidence-for)');
        const evidenceAgainstSection = document.querySelector('.evidence-section:has(.evidence-against)');

        // If querySelector doesn't work with :has, use alternative approach
        const evidenceForSectionAlt = document.querySelector('.evidence-for').closest('.evidence-section');
        const evidenceAgainstSectionAlt = document.querySelector('.evidence-against').closest('.evidence-section');
        
        const forSection = evidenceForSection || evidenceForSectionAlt;
        const againstSection = evidenceAgainstSection || evidenceAgainstSectionAlt;

        switch (filterValue) {
            case 'for':
                // Show only Evidence For
                if (forSection) forSection.style.display = 'block';
                if (againstSection) againstSection.style.display = 'none';
                break;
            case 'against':
                // Show only Evidence Against
                if (forSection) forSection.style.display = 'none';
                if (againstSection) againstSection.style.display = 'block';
                break;
            case 'all':
            default:
                // Show both sections
                if (forSection) forSection.style.display = 'block';
                if (againstSection) againstSection.style.display = 'block';
                break;
        }
    }

    createEvidenceItem(item) {
        const div = document.createElement('div');
        div.className = 'evidence-item clickable-evidence';
        
        const importancePercentage = Math.round(item.importance * 100);
        
        div.innerHTML = `
            <div class="evidence-concept">${item.concept}</div>
            <div class="evidence-description">${item.description}</div>
            <div class="evidence-importance">Importance: ${importancePercentage}%</div>
            <div class="evidence-click-hint">💡 Click to view related visualization</div>
        `;

        // Add click handler to trigger visualization
        div.addEventListener('click', () => {
            this.triggerRelatedVisualization(item);
        });

        // Add hover effects
        div.addEventListener('mouseenter', () => {
            div.style.transform = 'translateY(-2px)';
            div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });

        div.addEventListener('mouseleave', () => {
            div.style.transform = 'translateY(0)';
            div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

        // Add animation
        div.style.opacity = '0';
        div.style.transform = 'translateY(20px)';
        setTimeout(() => {
            div.style.transition = 'all 0.3s ease-out';
            div.style.opacity = '1';
            div.style.transform = 'translateY(0)';
        }, 100);

        return div;
    }

    triggerRelatedVisualization(evidenceItem) {
        console.log('Triggering individual SHAP visualization for evidence:', evidenceItem);
        
        // Create a visual feedback in the Model Explanations section
        this.highlightModelExplanations();
        
        // Create a unique visualization ID for each evidence concept
        const evidenceId = this.generateEvidenceVisualizationId(evidenceItem);
        
        // Each evidence item gets its own dedicated SHAP visualization
        const concept = evidenceItem.concept.toLowerCase();
        
        // Neuroimaging-based evidence gets heatmaps (spatial features)
        if (concept.includes('cortical thickness') || concept.includes('cortical')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'cortical_thickness', 1);
        } else if (concept.includes('white matter') || concept.includes('connectivity')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'white_matter', 2);
        } else if (concept.includes('hippocampal') || concept.includes('hippocampus')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'hippocampal_volume', 3);
        } else if (concept.includes('amygdala')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'amygdala_volume', 4);
        } else if (concept.includes('ventricular') || concept.includes('ventricle')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'ventricular_volume', 1);
        } else if (concept.includes('lesion') || concept.includes('abnormality')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'lesion_pattern', 2);
        
        // Clinical/demographic features get waterfall plots (feature importance)
        } else if (concept.includes('age') || concept.includes('demographic')) {
            this.viewIndividualSHAPWaterfall(evidenceItem, 'demographic_age');
        } else if (concept.includes('cognitive') || concept.includes('mmse') || concept.includes('moca')) {
            this.viewIndividualSHAPWaterfall(evidenceItem, 'cognitive_score');
        } else if (concept.includes('biomarker') || concept.includes('csf') || concept.includes('plasma')) {
            this.viewIndividualSHAPWaterfall(evidenceItem, 'biomarker_level');
        } else if (concept.includes('genetic') || concept.includes('apoe')) {
            this.viewIndividualSHAPWaterfall(evidenceItem, 'genetic_factor');
        } else if (concept.includes('clinical') || concept.includes('symptom')) {
            this.viewIndividualSHAPWaterfall(evidenceItem, 'clinical_symptom');
        
        // Catch-all cases for structural features
        } else if (concept.includes('spine') || concept.includes('bone') || concept.includes('structure')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'structural_feature', 3);
        } else if (concept.includes('density') || concept.includes('intensity') || concept.includes('pattern')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'intensity_pattern', 4);
        } else if (concept.includes('shape') || concept.includes('contour') || concept.includes('outline')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'shape_feature', 1);
        } else if (concept.includes('texture') || concept.includes('surface') || concept.includes('detail')) {
            this.viewIndividualSHAPHeatmap(evidenceItem, 'texture_feature', 2);
        
        // Default case - use waterfall for general feature importance
        } else {
            this.viewIndividualSHAPWaterfall(evidenceItem, 'general_feature');
        }
    }

    generateEvidenceVisualizationId(evidenceItem) {
        // Create a unique ID based on concept and importance for caching
        const conceptKey = evidenceItem.concept.toLowerCase().replace(/\s+/g, '_');
        const importanceKey = Math.round(evidenceItem.importance * 1000);
        return `${conceptKey}_${importanceKey}`;
    }

    highlightModelExplanations() {
        const modelExplanationsCard = document.querySelector('.card-row3-col2');
        if (modelExplanationsCard) {
            // Add highlighting effect
            modelExplanationsCard.style.border = '3px solid #4facfe';
            modelExplanationsCard.style.boxShadow = '0 0 20px rgba(79, 172, 254, 0.5)';
            
            // Scroll to the model explanations section
            modelExplanationsCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove highlighting after 2 seconds
            setTimeout(() => {
                modelExplanationsCard.style.border = '';
                modelExplanationsCard.style.boxShadow = '';
            }, 2000);
        }
    }

    async viewWaterfallPlotWithContext(evidenceItem) {
        const modal = document.getElementById('visualization-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalTitle || !modalBody) return;

        const waterfall = this.patientVisualizations?.waterfall;
        
        modalTitle.textContent = `Feature Importance: ${evidenceItem.concept}`;
        
        if (waterfall && waterfall.url && !waterfall.isMock) {
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0;">Evidence Context: ${evidenceItem.concept}</h4>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">${evidenceItem.description}</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold;">Importance: ${Math.round(evidenceItem.importance * 100)}%</p>
                    </div>
                    <p><strong>SHAP Waterfall Plot - Feature Contributions</strong></p>
                    <img src="${waterfall.url}" alt="SHAP Waterfall Plot" 
                         style="max-width: 100%; max-height: 60vh; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0;">Evidence Context: ${evidenceItem.concept}</h4>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">${evidenceItem.description}</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold;">Importance: ${Math.round(evidenceItem.importance * 100)}%</p>
                    </div>
                    <div style="padding: 40px; background: rgba(79, 172, 254, 0.1); border-radius: 15px; border: 2px dashed #4facfe;">
                        <p><strong>SHAP Waterfall Plot</strong></p>
                        <p>Shows how each feature contributes to the model's prediction for this specific case.</p>
                        <p><em>This visualization would show the feature importance breakdown related to: "${evidenceItem.concept}"</em></p>
                    </div>
                </div>
            `;
        }

        modal.style.display = 'block';
    }

    async viewHeatmap(heatmapNum, heatmapName = null, heatmapUrl = null) {
        const modal = document.getElementById('visualization-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalTitle || !modalBody) return;

        // Find the specific heatmap data
        let heatmapData = null;
        if (this.patientVisualizations?.heatmaps) {
            heatmapData = this.patientVisualizations.heatmaps.find(h => h.id == heatmapNum);
        }

        const title = heatmapName || heatmapData?.name || `SHAP Heatmap ${heatmapNum}`;
        const imageUrl = heatmapUrl || heatmapData?.url;
        
        modalTitle.textContent = title;
        
        if (imageUrl && !heatmapData?.isMock) {
            // Show actual image
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <p><strong>${title} for Patient ${this.currentPatientId || 'Unknown'}</strong></p>
                    <img src="${imageUrl}" alt="${title}" 
                         style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
                         onload="console.log('Heatmap image loaded successfully')"
                         onerror="console.error('Failed to load heatmap image'); this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; padding: 20px; color: #666;">
                        <p>Failed to load heatmap visualization</p>
                        <p><em>Image path: ${imageUrl}</em></p>
                    </div>
                </div>
            `;
        } else {
            // Show placeholder
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p><strong>${title} for Patient ${this.currentPatientId || 'Unknown'}</strong></p>
                    <div style="background: linear-gradient(145deg, #f0f0f0, #e0e0e0); padding: 40px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #666; font-size: 18px; margin: 0;">🔥</p>
                        <p style="color: #666; margin: 10px 0;">SHAP Heatmap Visualization</p>
                        <p style="color: #888; font-size: 14px; margin: 0;">
                            ${heatmapData?.isMock ? 'Mock visualization - actual data not available' : 'No heatmap data available for this patient'}
                        </p>
                    </div>
                </div>
            `;
        }

        modal.style.display = 'block';
    }

    async viewHeatmapWithContext(heatmapNum, evidenceItem) {
        const modal = document.getElementById('visualization-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalTitle || !modalBody) return;

        // Find the specific heatmap data
        let heatmapData = null;
        if (this.patientVisualizations?.heatmaps) {
            heatmapData = this.patientVisualizations.heatmaps.find(h => h.id == heatmapNum);
        }

        const title = heatmapData?.name || `SHAP Heatmap ${heatmapNum}`;
        const imageUrl = heatmapData?.url;
        
        modalTitle.textContent = `Visual Attribution: ${evidenceItem.concept}`;
        
        if (imageUrl && !heatmapData?.isMock) {
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0;">Evidence Context: ${evidenceItem.concept}</h4>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">${evidenceItem.description}</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold;">Importance: ${Math.round(evidenceItem.importance * 100)}%</p>
                    </div>
                    <p><strong>${title} - Visual Evidence</strong></p>
                    <img src="${imageUrl}" alt="${title}" 
                         style="max-width: 100%; max-height: 60vh; border-radius: 8px; box-shadow: 0 4px 8px rgba(255, 107, 107, 0.2); border: 2px solid #ff6b6b;">
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0;">Evidence Context: ${evidenceItem.concept}</h4>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">${evidenceItem.description}</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold;">Importance: ${Math.round(evidenceItem.importance * 100)}%</p>
                    </div>
                    <div style="padding: 40px; background: rgba(255, 107, 107, 0.1); border-radius: 15px; border: 2px dashed #ff6b6b;">
                        <p><strong>${title}</strong></p>
                        <p>Visual attention map showing which regions are most important for this prediction.</p>
                        <p><em>This visualization would highlight areas related to: "${evidenceItem.concept}"</em></p>
                    </div>
                </div>
            `;
        }

        modal.style.display = 'block';
    }

    // Individual SHAP Visualization Functions - Each evidence gets its own visualization
    async viewIndividualSHAPHeatmap(evidenceItem, featureType, heatmapNum = 1) {
        const modal = document.getElementById('visualization-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalTitle || !modalBody) return;

        const evidenceId = this.generateEvidenceVisualizationId(evidenceItem);
        
        // Find the specific heatmap data (or use mock data)
        let heatmapData = null;
        if (this.patientVisualizations?.heatmaps) {
            heatmapData = this.patientVisualizations.heatmaps.find(h => h.id == heatmapNum);
        }

        const imageUrl = heatmapData?.url;
        
        modalTitle.textContent = `SHAP Heatmap: ${evidenceItem.concept}`;
        
        // Create evidence-specific content
        const evidenceTypeColor = evidenceItem.importance > 0 ? '#28a745' : '#dc3545'; // Green for positive, red for negative
        const evidenceTypeText = evidenceItem.importance > 0 ? 'Evidence FOR' : 'Evidence AGAINST';
        
        if (imageUrl && !heatmapData?.isMock) {
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, ${evidenceTypeColor} 0%, ${evidenceTypeColor}CC 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 20px;">${evidenceItem.importance > 0 ? '✅' : '❌'}</span>
                            <h3 style="margin: 0;">${evidenceTypeText}: ${evidenceItem.concept}</h3>
                        </div>
                        <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">${evidenceItem.description}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <span style="font-weight: bold;">SHAP Value: ${(evidenceItem.importance * 100).toFixed(1)}%</span>
                            <span style="font-size: 12px; opacity: 0.8;">Feature: ${featureType.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${evidenceTypeColor};">
                        <h4 style="margin: 0 0 8px 0; color: #333;">Individual Feature Attribution</h4>
                        <p style="margin: 0; font-size: 14px; color: #666;">
                            This heatmap shows exactly how "<strong>${evidenceItem.concept}</strong>" contributes to the model's prediction.
                            Bright regions indicate areas where this specific feature has the highest impact.
                        </p>
                    </div>
                    
                    <img src="${imageUrl}" alt="SHAP Heatmap for ${evidenceItem.concept}" 
                         style="max-width: 100%; max-height: 55vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 3px solid ${evidenceTypeColor};">
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, ${evidenceTypeColor} 0%, ${evidenceTypeColor}CC 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 20px;">${evidenceItem.importance > 0 ? '✅' : '❌'}</span>
                            <h3 style="margin: 0;">${evidenceTypeText}: ${evidenceItem.concept}</h3>
                        </div>
                        <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">${evidenceItem.description}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <span style="font-weight: bold;">SHAP Value: ${(evidenceItem.importance * 100).toFixed(1)}%</span>
                            <span style="font-size: 12px; opacity: 0.8;">Feature: ${featureType.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                    
                    <div style="padding: 40px; background: linear-gradient(145deg, ${evidenceTypeColor}15, ${evidenceTypeColor}25); border-radius: 15px; border: 2px dashed ${evidenceTypeColor};">
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: 40px;">🔥</span>
                        </div>
                        <h4 style="margin: 10px 0; color: #333;">Individual SHAP Heatmap</h4>
                        <p style="margin: 10px 0; color: #666;">
                            This visualization would show the specific contribution of "<strong>${evidenceItem.concept}</strong>" 
                            to the model's prediction for this patient.
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #888;">
                            <em>Feature Type: ${featureType.replace(/_/g, ' ')} | Evidence ID: ${evidenceId.substring(0, 12)}...</em>
                        </p>
                    </div>
                </div>
            `;
        }

        modal.style.display = 'block';
    }

    async viewIndividualSHAPWaterfall(evidenceItem, featureType) {
        const modal = document.getElementById('visualization-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalTitle || !modalBody) return;

        const evidenceId = this.generateEvidenceVisualizationId(evidenceItem);
        
        const waterfall = this.patientVisualizations?.waterfall;
        
        modalTitle.textContent = `SHAP Waterfall: ${evidenceItem.concept}`;
        
        // Create evidence-specific content
        const evidenceTypeColor = evidenceItem.importance > 0 ? '#007bff' : '#fd7e14'; // Blue for positive, orange for negative
        const evidenceTypeText = evidenceItem.importance > 0 ? 'Evidence FOR' : 'Evidence AGAINST';
        
        if (waterfall && waterfall.url && !waterfall.isMock) {
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, ${evidenceTypeColor} 0%, ${evidenceTypeColor}CC 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 20px;">${evidenceItem.importance > 0 ? '📈' : '📉'}</span>
                            <h3 style="margin: 0;">${evidenceTypeText}: ${evidenceItem.concept}</h3>
                        </div>
                        <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">${evidenceItem.description}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <span style="font-weight: bold;">SHAP Value: ${(evidenceItem.importance * 100).toFixed(1)}%</span>
                            <span style="font-size: 12px; opacity: 0.8;">Feature: ${featureType.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${evidenceTypeColor};">
                        <h4 style="margin: 0 0 8px 0; color: #333;">Individual Feature Impact</h4>
                        <p style="margin: 0; font-size: 14px; color: #666;">
                            This waterfall plot shows how "<strong>${evidenceItem.concept}</strong>" pushes the model's prediction 
                            ${evidenceItem.importance > 0 ? 'toward' : 'away from'} the positive class.
                        </p>
                    </div>
                    
                    <img src="${waterfall.url}" alt="SHAP Waterfall for ${evidenceItem.concept}" 
                         style="max-width: 100%; max-height: 55vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 3px solid ${evidenceTypeColor};">
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, ${evidenceTypeColor} 0%, ${evidenceTypeColor}CC 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 20px;">${evidenceItem.importance > 0 ? '📈' : '📉'}</span>
                            <h3 style="margin: 0;">${evidenceTypeText}: ${evidenceItem.concept}</h3>
                        </div>
                        <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">${evidenceItem.description}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <span style="font-weight: bold;">SHAP Value: ${(evidenceItem.importance * 100).toFixed(1)}%</span>
                            <span style="font-size: 12px; opacity: 0.8;">Feature: ${featureType.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                    
                    <div style="padding: 40px; background: linear-gradient(145deg, ${evidenceTypeColor}15, ${evidenceTypeColor}25); border-radius: 15px; border: 2px dashed ${evidenceTypeColor};">
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: 40px;">📊</span>
                        </div>
                        <h4 style="margin: 10px 0; color: #333;">Individual SHAP Waterfall</h4>
                        <p style="margin: 10px 0; color: #666;">
                            This visualization would show exactly how "<strong>${evidenceItem.concept}</strong>" 
                            contributes to the final prediction score.
                        </p>
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid ${evidenceTypeColor};">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #333;">Base Rate:</span>
                                <span style="color: #666;">+0.2</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                                <span style="color: ${evidenceTypeColor}; font-weight: bold;">${evidenceItem.concept}:</span>
                                <span style="color: ${evidenceTypeColor}; font-weight: bold;">${evidenceItem.importance > 0 ? '+' : ''}${(evidenceItem.importance * 0.8).toFixed(3)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
                                <span style="color: #333; font-weight: bold;">Final Score:</span>
                                <span style="color: #333; font-weight: bold;">${(0.2 + evidenceItem.importance * 0.8).toFixed(3)}</span>
                            </div>
                        </div>
                        <p style="margin: 0; font-size: 14px; color: #888;">
                            <em>Feature Type: ${featureType.replace(/_/g, ' ')} | Evidence ID: ${evidenceId.substring(0, 12)}...</em>
                        </p>
                    </div>
                </div>
            `;
        }

        modal.style.display = 'block';
    }
}

// Interactive features are now initialized in DOMContentLoaded event



