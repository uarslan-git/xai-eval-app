// --- Heatmap Gallery Logic (Dynamic) ---
async function loadHeatmapGallery() {
  const gallery = document.getElementById('heatmap-gallery');
  if (!gallery) return;
  gallery.innerHTML = '<h2 style="color:#e2e8f0;">Heatmap Gallery</h2>';
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.flexWrap = 'wrap';
  row.style.justifyContent = 'center';
  row.style.gap = '20px';
  try {
    const res = await fetch('http://localhost:4000/api/heatmaps');
    const data = await res.json();
    if (Array.isArray(data.images)) {
      data.images.forEach(filename => {
        const img = document.createElement('img');
        img.src = `http://localhost:4000/heatmaps/${filename}`;
        img.alt = filename;
        img.style.maxWidth = '200px';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 2px 8px #0006';
        row.appendChild(img);
      });
    } else {
      row.innerHTML = '<span style="color:#e2e8f0;">No heatmap images found.</span>';
    }
  } catch (e) {
    row.innerHTML = '<span style="color:#e2e8f0;">Failed to load heatmap images.</span>';
  }
  gallery.appendChild(row);
}

window.addEventListener('DOMContentLoaded', loadHeatmapGallery);
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
const true_diag    = document.getElementById("true-diag");
const x_ray_image = document.getElementById("patient-x-ray-image");
const biomarkers_list = document.querySelector(".biomarkers-list");

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
    if (total_page_count > 0) {
        let progress_value = (current_page_nr / total_page_count) * 100; // Convert to percentage
        let progress_bar = document.querySelector(".progress-bar");
        progress_bar.style.width = progress_value + "%";
        document.getElementById("progress-bar-text").textContent = "Diagnosis " + current_page_nr.toString() + "/" + total_page_count.toString();
    }
}

function set_patient_id(id)
{
    patient_id1.textContent = id.toString();
    patient_id2.textContent = "Patient ID: " + id.toString();
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
        study_type: params.get('study_type') ? decodeURIComponent(params.get('study_type')) : null,
        page_nr: params.get('page_nr') ? decodeURIComponent(params.get('page_nr')) : null,
        total_pages: params.get('total_pages') ? decodeURIComponent(params.get('total_pages')) : null,
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
    if(current_page_nr >= up.total_pages)
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

    csv_json_get_all_attributes_and_set_in_html_page(page_nr, up.total_pages);
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
    if(current_page_nr >= up.total_pages)
    {
        window.location.href = "/feedback/index.html"; // Redirect to test.html
        return;
    }

    //increment page number
    page_nr = current_page_nr + 1;
    update_study_url(participant_id, study_id, up.study_type, page_nr, up.total_pages);
    clear_radio_buttons();
    csv_json_get_all_attributes_and_set_in_html_page(page_nr, up.total_pages);
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
            csv_json_get_all_attributes_and_set_in_html_page(page_nr, up.total_pages);
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

function csv_json_get_total_page_count() {
    return input.PATIENT_ID.length;
}

function csv_json_get_biomarkers(page_nr) {
    const index = page_nr - 1;
    const biomarkers = [
        input.Concept1_Caption[index],
        input.Concept2_Caption[index],
        input.Concept3_Caption[index]
    ];
    return biomarkers.filter(b => b && b.trim() !== '');
}

function set_biomarkers(biomarkers) {
    biomarkers_list.innerHTML = '';
    biomarkers.forEach(biomarker => {
        const li = document.createElement('li');
        li.textContent = biomarker;
        biomarkers_list.appendChild(li);
    });
}

function csv_json_get_main_attributes(page_nr)
{

    index = page_nr - 1;
    l_patient_id = input.PATIENT_ID[index];
    l_x_ray_loc    = input.X_RAY_LOCATION[index];
    l_true_diag = input.TRUE_DIAG[index];
    l_suggested_diag = input.SUGGESTED_DIAG[index];
    l_image = "img/" + input.X_RAY_IMAGE[index];
    attributes = [l_patient_id, l_image, l_x_ray_loc, l_true_diag, l_suggested_diag]
    return attributes;
}

function set_main_attributes_in_html_page(page_nr, total_pages, attr)
{
    //attributes = [patient_id, image, x_ray_loc, true_diag, suggested_diag]
    set_patient_id(attr[0]);
    set_x_ray_image(attr[1]);
    set_x_ray_location(attr[2]);
    set_true_diag(attr[3]);
    set_suggested_diag(attr[4])
    const biomarkers = csv_json_get_biomarkers(page_nr);
    set_biomarkers(biomarkers);
    set_progress(page_nr, total_pages);
}

function csv_json_get_all_attributes_and_set_in_html_page(page_nr, total_pages)
{
    attr = csv_json_get_main_attributes(page_nr);
    set_main_attributes_in_html_page(page_nr, total_pages, attr);
}

async function init_page()
{
    if (input == null) {
        console.log('Input is null, returning.');
        return;
    }

    console.log('App is running!');
    const url_params = get_params_from_url();
    let participant_id = url_params.participant_id;
    let study_id = url_params.study_id;
    let page_nr = get_page_nr_from_url();
    let total_pages = parseInt(url_params.total_pages);

    // If total_pages is not in the URL, calculate it and update the URL
    if (isNaN(total_pages) || total_pages === 0) {
        total_pages = csv_json_get_total_page_count();
        // Update the URL with total_pages
        update_study_url(participant_id, study_id, url_params.study_type, page_nr, total_pages);
        return; // Exit to allow the page to reload with the correct URL
    }

    db_get_and_set_participant_diagnosis(participant_id, study_id, page_nr);
    csv_json_get_all_attributes_and_set_in_html_page(page_nr, total_pages);
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
    await load_json_data();
});

// --- Mockserver integration for evidences ---

async function fetchEvidences(diagnosis) {
  try {
    const res = await fetch(`http://localhost:4000/api/evidence/${diagnosis}`);
    if (!res.ok) {
      console.error("Failed to fetch evidence for", diagnosis);
      return null;
    }
    const data = await res.json();
    return { evidenceFor: data.evidenceFor, evidenceAgainst: data.evidenceAgainst };
  } catch (e) {
    console.error("Error fetching evidence:", e);
    return null;
  }
}

function renderEvidences(evidences) {
  const expl = document.querySelector('.explanation-card .explanation-text');
  if (!expl) return;

  if (!evidences) {
    expl.innerHTML = '<p>Could not load evidence.</p>';
    return;
  }

  let html = '<div><b>Evidence For:</b><ul>' + (evidences.evidenceFor || []).map(e => `<li>${e}</li>`).join('') + '</ul></div>';
  html += '<div><b>Evidence Against:</b><ul>' + (evidences.evidenceAgainst || []).map(e => `<li>${e}</li>`).join('') + '</ul></div>';
  expl.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
  const diagContainer = document.querySelector('.diagnosis-options');
  if (diagContainer) {
    diagContainer.addEventListener('change', async e => {
      if (e.target.name === 'health') {
        const evidences = await fetchEvidences(e.target.value);
        renderEvidences(evidences);
      }
    });
  }
});

button_next.addEventListener("click", function() {
    next_button_action();
});

button_prev.addEventListener("click", function() {
    prev_button_action();
});