let currentUser = null;
let currentCourse = null;
let currentSet = {};
let questions = [];
let editSetId = null;
let editSetQuestions = [];
let newExtractedQuestions = [];
let quizQuestions = [];
let userAnswers = {};
const LABELS = ["A", "B", "C", "D"];

function showRegister() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
    document.getElementById("login-alert").innerHTML = "";
}

function showLogin() {
    document.getElementById("register-form").style.display = "none";
    document.getElementById("login-form").style.display = "block";
    document.getElementById("login-alert").innerHTML = "";
}

async function doLogin() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if (!username || !password) { showAlert("login-alert", "Please fill all fields", "danger"); return; }

    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const data = await res.json();

    if (data.error) { showAlert("login-alert", data.error, "danger"); return; }

    currentUser = data.user;
    document.getElementById("nav-user-name").textContent = "👤 " + currentUser.name;
    document.getElementById("page-login").style.display = "none";
    document.getElementById("page-app").style.display = "block";
    loadCourses();
}

async function doRegister() {
    const name = document.getElementById("reg-name").value.trim();
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    if (!name || !username || !password) {
        showAlert("login-alert", "Please fill all fields", "danger");
        return;
    }

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password })
    });
    const data = await res.json();

    if (data.error) {
        showAlert("login-alert", data.error, "danger");
        return;
    }
    showAlert("login-alert", "Registered successfully! Please sign in.", "success");
    showLogin();
}

async function doLogout() {
    await fetch("/api/logout", { method: "POST" });
    currentUser = null;
    currentCourse = null;
    document.getElementById("page-app").style.display = "none";
    document.getElementById("page-login").style.display = "flex";
}

function showAlert(containerId, msg, type) {
    document.getElementById(containerId).innerHTML =
        `<div class="alert alert-${type} py-2 small">${msg}</div>`;
}

function showSection(name) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById("sec-" + name).classList.add("active");
    document.querySelectorAll(".sidebar .nav-link").forEach(s => s.classList.remove("active"));
    const sb = document.getElementById("sb-" + name);
    if (sb) sb.classList.add("active");

    const titles = {
        "courses": ["All Courses", "Home › Courses"],
        "new-course": ["New Course", "Home › Courses › New"],
        "course-detail": ["Course Detail", `Home › Courses › ${currentCourse?.name || ""}`],
        "skills": ["Skills", `Home › Courses › ${currentCourse?.name || ""} › Skills`],
        "lessons": ["Lessons", `Home › Courses › ${currentCourse?.name || ""} › Lessons`],
        "qsets": ["Question Sets", `Home › Courses › ${currentCourse?.name || ""} › Question Sets`],
        "edit-set": ["Edit Question Set", `Home › Courses › ${currentCourse?.name || ""} › Edit`],
        "view-set": ["View Question Set", `Home › Courses › ${currentCourse?.name || ""} › View`],
        "quiz": ["Quiz", "Home › Quiz"],
        "result": ["Result", "Home › Result"],
    };
    const t = titles[name] || ["MCQ Portal", "Home"];
    document.getElementById("page-title").textContent = t[0];
    document.getElementById("page-breadcrumb").textContent = t[1];
    if (name === "qsets") populateSetDropdowns();
    window.scrollTo(0, 0);
}

function showCourseNav() {
    ["sb-course-detail", "sb-skills", "sb-lessons", "sb-qsets"].forEach(id => {
        document.getElementById(id).style.display = "block";
    });
    document.getElementById("course-tag").style.display = "inline-block";
    document.getElementById("course-tag").textContent = "📘 " + currentCourse.name;
}

async function loadCourses() {
    const res = await fetch("/api/courses");
    const courses = await res.json();
    const el = document.getElementById("courses-list");

    if (!courses.length) {
        el.innerHTML = `<div class="text-center py-5 text-muted">
        <i class="bi bi-journal-x" style="font-size:3rem;"></i>
        <p class="mt-3">No courses yet. Create your first course!</p>
        <button class="btn text-white mt-2" style="background:#7c3aed;" onclick="showSection('new-course')">
          <i class="bi bi-plus-lg me-1"></i>Create Course
        </button>
      </div>`;
        return;
    }

    el.innerHTML = courses.map(c => `
      <div class="course-card" onclick="openCourse(${c.id})">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="fw-semibold mb-1">${c.name} <span class="badge bg-light text-dark fw-normal ms-1">${c.code || ""}</span></h6>
            <div class="text-muted small mb-2">${c.subject} · ${c.difficulty}</div>
            <div class="d-flex gap-2 flex-wrap">
              <span class="badge bg-light text-dark"><i class="bi bi-star me-1"></i>${c.skills?.length || 0} Skills</span>
              <span class="badge bg-light text-dark"><i class="bi bi-book me-1"></i>${c.lessons?.length || 0} Lessons</span>
              <span class="badge bg-light text-dark"><i class="bi bi-folder me-1"></i>${c.question_sets?.length || 0} Sets</span>
            </div>
          </div>
          <div class="text-end">
            <div class="meta-badge mb-1">Created by ${c.created_by}</div>
            <div class="text-muted" style="font-size:0.7rem;">${c.created_at?.split(" ")[0] || ""}</div>
            ${c.updated_by !== c.created_by ? `<div class="meta-badge mt-1">Updated by ${c.updated_by}</div>` : ""}
          </div>
        </div>
      </div>`).join("");
}

async function openCourse(id) {
    const res = await fetch(`/api/courses/${id}`);
    currentCourse = await res.json();
    showCourseNav();
    renderCourseDetail();
    showSection("course-detail");
}

function renderCourseDetail() {
    const c = currentCourse;
    const totalQ = (c.question_sets || []).reduce((a, s) => a + (s.questions?.length || 0), 0);
    document.getElementById("cd-skills-count").textContent = c.skills?.length || 0;
    document.getElementById("cd-lessons-count").textContent = c.lessons?.length || 0;
    document.getElementById("cd-sets-count").textContent = c.question_sets?.length || 0;
    document.getElementById("cd-q-count").textContent = totalQ;

    document.getElementById("course-detail-body").innerHTML = `
      <div class="row g-3">
        <div class="col-md-4"><strong class="small text-muted">Course Name</strong><div>${c.name}</div></div>
        <div class="col-md-4"><strong class="small text-muted">Code</strong><div>${c.code || "—"}</div></div>
        <div class="col-md-4"><strong class="small text-muted">Subject</strong><div>${c.subject}</div></div>
        <div class="col-md-4"><strong class="small text-muted">Difficulty</strong><div>${c.difficulty}</div></div>
        <div class="col-md-4"><strong class="small text-muted">Marks/Question</strong><div>${c.marks}</div></div>
        <div class="col-md-4"><strong class="small text-muted">Description</strong><div>${c.description || "—"}</div></div>
        <div class="col-12">
          <span class="meta-badge me-2"><i class="bi bi-person-fill me-1"></i>Created by ${c.created_by} on ${c.created_at?.split(" ")[0] || ""}</span>
          <span class="meta-badge"><i class="bi bi-pencil-fill me-1"></i>Last updated by ${c.updated_by} on ${c.updated_at?.split(" ")[0] || ""}</span>
        </div>
      </div>`;

    renderCourseSets();

    renderSkillsList(c.skills || []);
    renderLessonsList(c.lessons || []);
}

function renderCourseSets() {
    const c = currentCourse;
    const el = document.getElementById("course-sets-list");
    if (!c.question_sets?.length) {
        el.innerHTML = '<p class="text-muted small">No question sets yet.</p>';
        return;
    }
    el.innerHTML = c.question_sets.map(s => `
      <div class="set-card">
        <div>
          <div class="fw-semibold">${s.name}
            <span class="badge bg-light text-dark fw-normal ms-1">${s.type || ""}</span>
          </div>
          <div class="text-muted small mt-1">
            Questions: ${s.questions?.length || 0} &nbsp;|&nbsp;
            Difficulty: ${s.difficulty || "—"} &nbsp;|&nbsp;
            Marks: ${s.questions?.reduce((a, q) => a + (q.marks || 1), 0) || 0}
          </div>
          <div class="mt-1">
            <span class="meta-badge me-1"><i class="bi bi-upload me-1"></i>Uploaded by ${s.created_by}</span>
            ${s.updated_by !== s.created_by ? `<span class="meta-badge"><i class="bi bi-pencil me-1"></i>Edited by ${s.updated_by}</span>` : ""}
          </div>
          ${s.edit_history?.length > 1 ? `
          <div class="mt-1">
            <small class="text-muted"><i class="bi bi-clock-history me-1"></i>
              ${s.edit_history.map(h => `${h.action} by ${h.by} at ${h.at}`).join(" → ")}
            </small>
          </div>` : ""}
        </div>
        <div class="d-flex gap-2 flex-wrap mt-2 mt-md-0">
          <button class="btn btn-sm btn-outline-primary" onclick="viewSet(${s.id})"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="editSet(${s.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm text-white" style="background:#7c3aed;" onclick="startQuiz(${s.id})"><i class="bi bi-play-fill"></i> Quiz</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSet(${s.id})"><i class="bi bi-trash"></i></button>
        </div>
      </div>`).join("");
}

async function createCourse() {
    const name = document.getElementById("nc-name").value.trim();
    const subj = document.getElementById("nc-subject").value.trim();
    const diff = document.getElementById("nc-difficulty").value;
    if (!name || !subj || !diff) { alert("Please fill all required fields."); return; }

    const res = await fetch("/api/courses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name, code: document.getElementById("nc-code").value.trim(),
            subject: subj, difficulty: diff,
            marks: parseInt(document.getElementById("nc-marks").value) || 1,
            description: document.getElementById("nc-desc").value.trim()
        })
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    currentCourse = data.course;
    showCourseNav();
    renderCourseDetail();
    showSection("course-detail");
}

function editCourse() {
    const c = currentCourse;
    document.getElementById("nc-name").value = c.name;
    document.getElementById("nc-code").value = c.code || "";
    document.getElementById("nc-subject").value = c.subject;
    document.getElementById("nc-difficulty").value = c.difficulty;
    document.getElementById("nc-marks").value = c.marks;
    document.getElementById("nc-desc").value = c.description || "";
    showSection("new-course");
    document.querySelector("#sec-new-course .card-footer .btn:last-child").textContent = "Update Course";
    document.querySelector("#sec-new-course .card-footer .btn:last-child").onclick = updateCourse;
}

async function updateCourse() {
    const res = await fetch(`/api/courses/${currentCourse.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: document.getElementById("nc-name").value.trim(),
            code: document.getElementById("nc-code").value.trim(),
            subject: document.getElementById("nc-subject").value.trim(),
            difficulty: document.getElementById("nc-difficulty").value,
            marks: parseInt(document.getElementById("nc-marks").value) || 1,
            description: document.getElementById("nc-desc").value.trim()
        })
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    await openCourse(currentCourse.id);
}

async function addSkill() {
    const name = document.getElementById("skill-name").value.trim();
    const desc = document.getElementById("skill-desc").value.trim();
    if (!name || !desc) { alert("Please fill Skill Name and Description."); return; }

    const res = await fetch(`/api/courses/${currentCourse.id}/skills`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc })
    });
    const data = await res.json();

    const courseRes = await fetch(`/api/courses/${currentCourse.id}`);
    currentCourse = await courseRes.json();

    document.getElementById("skill-name").value = "";
    document.getElementById("skill-desc").value = "";
    renderSkillsList(currentCourse.skills);
    alert("Skill added successfully!");
}

function renderSkillsList(skills) {
    const el = document.getElementById("skills-list");
    if (!skills.length) { el.innerHTML = '<p class="text-muted small">No skills added yet.</p>'; return; }
    el.innerHTML = skills.map(s => `
      <div class="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
        <div><strong>${s.name}</strong> <span class="text-muted small ms-2">${s.description}</span></div>
        <div><span class="meta-badge me-1">By ${s.added_by || "—"}</span><span class="badge bg-success">Added</span></div>
      </div>`).join("");
}

async function addLesson() {
    const name = document.getElementById("lesson-name").value.trim();
    const summary = document.getElementById("lesson-summary").value.trim();
    const slno = document.getElementById("lesson-slno").value;
    if (!name || !summary) { alert("Please fill Lesson Name and Summary."); return; }

    const res = await fetch(`/api/courses/${currentCourse.id}/lessons`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sl_no: slno, name, summary })
    });
    const data = await res.json();

    const courseRes = await fetch(`/api/courses/${currentCourse.id}`);
    currentCourse = await courseRes.json();

    document.getElementById("lesson-name").value = "";
    document.getElementById("lesson-summary").value = "";
    document.getElementById("lesson-slno").value = currentCourse.lessons.length + 1;
    renderLessonsList(currentCourse.lessons);
    alert("Lesson added successfully!");
}

function renderLessonsList(lessons) {
    const el = document.getElementById("lessons-list");
    if (!lessons.length) { el.innerHTML = '<p class="text-muted small">No lessons added yet.</p>'; return; }
    el.innerHTML = lessons.map(l => `
      <div class="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
        <div><strong>${l.sl_no}. ${l.name}</strong> <span class="text-muted small ms-2">${l.summary}</span></div>
        <div><span class="meta-badge me-1">By ${l.added_by || "—"}</span><span class="badge bg-success">Added</span></div>
      </div>`).join("");
}

function goQsStep(n) {
    [1, 2, 3, 4].forEach(i => {
        document.getElementById(`qs-step-${i}`).style.display = i === n ? "block" : "none";
    });
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById("stp-" + i);
        if (!el) continue;
        el.classList.remove("active", "done");
        if (i < n) el.classList.add("done");
        if (i === n) el.classList.add("active");
    }
    if (n === 1) populateSetDropdowns();
    window.scrollTo(0, 0);
}

async function populateSetDropdowns() {
    const res = await fetch(`/api/courses/${currentCourse.id}`);
    currentCourse = await res.json();

    const sl = document.getElementById("set-lesson");
    const ss = document.getElementById("set-skill");

    const lessons = currentCourse.lessons || [];
    const skills = currentCourse.skills || [];

    sl.innerHTML = '<option value="">Select Lesson</option>' +
        lessons.map(l => `<option value="${l.id}">${l.sl_no}. ${l.name}</option>`).join("");

    ss.innerHTML = '<option value="">Select Skill</option>' +
        skills.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

    if (!lessons.length) {
        sl.innerHTML += '<option disabled>No lessons added yet — go to Lessons tab first</option>';
    }
    if (!skills.length) {
        ss.innerHTML += '<option disabled>No skills added yet — go to Skills tab first</option>';
    }
}

function resetSetForm() {
    document.getElementById("set-name").value = "";
    document.getElementById("set-type").value = "";
    document.getElementById("set-difficulty").value = "";
    document.getElementById("set-marks").value = "1";
    document.getElementById("file-input").value = "";
    document.getElementById("file-preview-list").innerHTML = "";
    document.getElementById("upload-status").innerHTML = "";
    document.getElementById("extract-btn").disabled = true;
    questions = [];
}

function previewFiles(input) {
    const files = Array.from(input.files);
    if (!files.length) return;
    document.getElementById("file-preview-list").innerHTML = files.map(f =>
        `<div class="d-flex align-items-center gap-2 border rounded p-2 mb-1 small">
        <i class="bi bi-file-earmark-text text-primary"></i>
        <span>${f.name}</span>
        <span class="badge bg-light text-dark ms-auto">${(f.size / 1024).toFixed(1)} KB</span>
      </div>`).join("");
    document.getElementById("extract-btn").disabled = false;
    document.getElementById("upload-status").innerHTML = "";
}

function previewAddFiles(input) {
    const files = Array.from(input.files);
    if (!files.length) return;
    document.getElementById("add-file-preview").innerHTML = files.map(f =>
        `<div class="d-flex align-items-center gap-2 border rounded p-1 mb-1 small">
        <i class="bi bi-file-earmark-text text-primary"></i>
        <span>${f.name}</span>
      </div>`).join("");
    document.getElementById("add-extract-btn").disabled = false;
}

const dz = document.getElementById("drop-zone");
dz.addEventListener("dragover", e => { e.preventDefault(); dz.style.borderColor = "#7c3aed"; });
dz.addEventListener("dragleave", () => { dz.style.borderColor = ""; });
dz.addEventListener("drop", e => {
    e.preventDefault(); dz.style.borderColor = "";
    const inp = document.getElementById("file-input");
    inp.files = e.dataTransfer.files;
    previewFiles(inp);
});

const adz = document.getElementById("add-drop-zone");
adz.addEventListener("dragover", e => { e.preventDefault(); adz.style.borderColor = "#7c3aed"; });
adz.addEventListener("dragleave", () => { adz.style.borderColor = ""; });
adz.addEventListener("drop", e => {
    e.preventDefault(); adz.style.borderColor = "";
    const inp = document.getElementById("add-file-input");
    inp.files = e.dataTransfer.files;
    previewAddFiles(inp);
});

function setStatus(id, msg, type) {
    const map = { "info": "alert-info", "success": "alert-success", "danger": "alert-danger" };
    document.getElementById(id).innerHTML = `<div class="alert ${map[type] || 'alert-info'} small">${msg}</div>`;
}

async function extractQuestions() {
    const name = document.getElementById("set-name").value.trim();
    const type = document.getElementById("set-type").value;
    if (!name || !type) { alert("Please fill Set Name and Assessment Type first."); goQsStep(1); return; }

    currentSet = {
        name, type,
        difficulty: document.getElementById("set-difficulty").value,
        marks: parseInt(document.getElementById("set-marks").value) || 1,
        lesson_id: document.getElementById("set-lesson").value ? parseInt(document.getElementById("set-lesson").value) : null,
        skill_id: document.getElementById("set-skill").value ? parseInt(document.getElementById("set-skill").value) : null,
        questions: []
    };

    const btn = document.getElementById("extract-btn");
    btn.disabled = true;
    setStatus("upload-status", '<span class="spinner-border spinner-border-sm me-2"></span>Extracting and translating…', "info");

    const fd = new FormData();
    Array.from(document.getElementById("file-input").files).forEach(f => fd.append("files", f));

    try {
        const res = await fetch("/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        questions = data.questions;
        if (!questions.length) throw new Error("No questions found.");
        const translated = questions.filter(q => q.hi_translated).length;
        setStatus("upload-status",
            `<i class="bi bi-check-circle-fill me-2"></i>Extracted ${questions.length} questions.
         ${translated > 0 ? `<span class="translated-badge ms-1">🤖 ${translated} auto-translated</span>` : ""}`,
            "success");
        document.getElementById("q-count-label").textContent = `${questions.length} questions`;
        setTimeout(() => { buildEditor(questions, "editor-container", ""); goQsStep(3); }, 700);
    } catch (err) {
        setStatus("upload-status", `<i class="bi bi-exclamation-triangle-fill me-2"></i>${err.message}`, "danger");
        btn.disabled = false;
    }
}

async function extractMoreQuestions() {
    const btn = document.getElementById("add-extract-btn");
    btn.disabled = true;
    setStatus("add-upload-status", '<span class="spinner-border spinner-border-sm me-2"></span>Extracting…', "info");

    const fd = new FormData();
    Array.from(document.getElementById("add-file-input").files).forEach(f => fd.append("files", f));

    try {
        const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}/add_questions`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        newExtractedQuestions = data.questions;
        setStatus("add-upload-status", `<i class="bi bi-check-circle-fill me-2"></i>Found ${data.questions.length} new questions.`, "success");
        buildEditor(newExtractedQuestions, "new-editor-container", "n");
        document.getElementById("new-questions-editor").style.display = "block";
    } catch (err) {
        setStatus("add-upload-status", `<i class="bi bi-exclamation-triangle-fill me-2"></i>${err.message}`, "danger");
        btn.disabled = false;
    }
}

function buildEditor(qs, containerId, prefix) {
    const c = document.getElementById(containerId);
    c.innerHTML = "";
    qs.forEach((q, qi) => {
        const p = prefix + qi;
        const enOpts = LABELS.map((lbl, oi) => `
        <div class="d-flex align-items-center gap-2 mb-2">
          <div class="opt-label-circle">${lbl}</div>
          <input class="form-control form-control-sm" id="en-opt-${p}-${oi}" value="${esc(q.options && q.options[oi] || '')}" placeholder="Option ${lbl}">
        </div>`).join("");
        const hiOpts = LABELS.map((lbl, oi) => `
        <div class="d-flex align-items-center gap-2 mb-2">
          <div class="opt-label-circle">${lbl}</div>
          <input class="form-control form-control-sm hi-font" id="hi-opt-${p}-${oi}" value="${esc(q.hindi_options && q.hindi_options[oi] || '')}" placeholder="विकल्प ${lbl}">
        </div>`).join("");

        const translatedBadge = q.hi_translated ? `<span class="translated-badge">🤖 Auto Translated</span>` : "";
        const correctVal = q.answer || "";

        c.innerHTML += `
        <div class="q-editor">
          <div class="q-editor-head">
            <div class="d-flex align-items-center gap-2">
              <span class="badge text-white fw-semibold" style="background:#1e1b4b;">Q${qi + 1}</span>
              ${translatedBadge}
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <div class="d-flex gap-1">
                <span class="lang-tab active" id="tab-en-${p}" onclick="swLang('${p}','en')">English</span>
                <span class="lang-tab" id="tab-hi-${p}" onclick="swLang('${p}','hi')">हिंदी</span>
              </div>
              <button class="btn btn-sm btn-outline-warning" onclick="manualTranslate('${p}','en_to_hi')">
                <i class="bi bi-translate"></i> EN→हिंदी
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="manualTranslate('${p}','hi_to_en')">
                <i class="bi bi-translate"></i> हिंदी→EN
              </button>
            </div>
          </div>
          <div class="p-3">
            <div id="panel-en-${p}">
              <div class="mb-2">
                <label class="form-label fw-semibold small">Question (English) <span class="req">●</span></label>
                <textarea class="form-control form-control-sm" id="en-q-${p}" rows="2">${esc(q.question || '')}</textarea>
              </div>
              <label class="form-label fw-semibold small">Options</label>
              ${enOpts}
            </div>
            <div id="panel-hi-${p}" style="display:none">
              <div class="mb-2">
                <label class="form-label fw-semibold small">Question (हिंदी)</label>
                <textarea class="form-control form-control-sm hi-font" id="hi-q-${p}" rows="2">${esc(q.hindi_question || '')}</textarea>
              </div>
              <label class="form-label fw-semibold small">विकल्प</label>
              ${hiOpts}
            </div>
            <div class="d-flex align-items-center gap-2 mt-3 pt-3 border-top">
              <label class="fw-semibold small mb-0">✅ Correct Answer <span class="req">●</span></label>
              <select class="form-select form-select-sm w-auto" id="ans-${p}">
                <option value="">-- Select --</option>
                ${LABELS.map(l => `<option value="${l}" ${correctVal === l ? "selected" : ""}>${l}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>`;
    });
}

function swLang(p, lang) {
    document.getElementById(`panel-en-${p}`).style.display = lang === "en" ? "block" : "none";
    document.getElementById(`panel-hi-${p}`).style.display = lang === "hi" ? "block" : "none";
    document.getElementById(`tab-en-${p}`).classList.toggle("active", lang === "en");
    document.getElementById(`tab-hi-${p}`).classList.toggle("active", lang === "hi");
}

async function manualTranslate(p, direction) {
    try {
        if (direction === "en_to_hi") {
            const enQ = document.getElementById(`en-q-${p}`).value.trim();
            const r = await fetch("/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: enQ, direction: "en_to_hi" }) });
            const d = await r.json();
            document.getElementById(`hi-q-${p}`).value = d.translated || "";
            for (let oi = 0; oi < 4; oi++) {
                const enOpt = document.getElementById(`en-opt-${p}-${oi}`).value.trim();
                if (enOpt) {
                    const r2 = await fetch("/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: enOpt, direction: "en_to_hi" }) });
                    const d2 = await r2.json();
                    document.getElementById(`hi-opt-${p}-${oi}`).value = d2.translated || "";
                }
            }
            swLang(p, "hi");
        } else {
            const hiQ = document.getElementById(`hi-q-${p}`).value.trim();
            const r = await fetch("/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: hiQ, direction: "hi_to_en" }) });
            const d = await r.json();
            document.getElementById(`en-q-${p}`).value = d.translated || "";
            for (let oi = 0; oi < 4; oi++) {
                const hiOpt = document.getElementById(`hi-opt-${p}-${oi}`).value.trim();
                if (hiOpt) {
                    const r2 = await fetch("/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: hiOpt, direction: "hi_to_en" }) });
                    const d2 = await r2.json();
                    document.getElementById(`en-opt-${p}-${oi}`).value = d2.translated || "";
                }
            }
            swLang(p, "en");
        }
    } catch (err) { alert("Translation failed: " + err.message); }
}

function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function readEditorQuestions(qs, prefix) {
    return qs.map((q, qi) => {
        const p = prefix + qi;
        const enOpts = {}, hiOpts = {};
        LABELS.forEach((lbl, oi) => {
            enOpts[lbl] = document.getElementById(`en-opt-${p}-${oi}`)?.value.trim() || "";
            hiOpts[lbl] = document.getElementById(`hi-opt-${p}-${oi}`)?.value.trim() || "";
        });
        return {
            id: qi + 1,
            question_type: "multiple_choice",
            translations: {
                en: { question: document.getElementById(`en-q-${p}`)?.value.trim() || "", options: enOpts, explanation: "", translated: false },
                hi: { question: document.getElementById(`hi-q-${p}`)?.value.trim() || "", options: hiOpts, explanation: "", translated: q.hi_translated || false }
            },
            correct_answer: document.getElementById(`ans-${p}`)?.value || "",
            difficulty: currentSet.difficulty || "medium",
            marks: currentSet.marks || 1,
            subject: currentCourse?.subject || "",
            uploaded_by: currentUser?.name || "",
            uploaded_at: new Date().toLocaleString()
        };
    });
}

async function saveAll() {
    const finalQ = readEditorQuestions(questions, "");
    currentSet.questions = finalQ;

    const res = await fetch(`/api/courses/${currentCourse.id}/question_sets`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_set: currentSet })
    });
    const data = await res.json();
    if (data.error) { alert("Save failed: " + data.error); return; }

    document.getElementById("saved-summary").textContent =
        `${finalQ.length} questions saved under "${currentSet.name}"`;

    await openCourse(currentCourse.id);
    goQsStep(4);
}

async function appendNewQuestions() {
    const newQ = readEditorQuestions(newExtractedQuestions, "n");
    const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}`);
    const s = await res.json();

    const existingQ = s.questions || [];
    newQ.forEach((q, i) => q.id = existingQ.length + i + 1);
    s.questions = [...existingQ, ...newQ];
    s.updated_by = currentUser?.name;
    s.updated_at = new Date().toLocaleString();

    await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s)
    });

    editSetQuestions = s.questions.map(q => ({
        question: q.translations?.en?.question || "",
        options: Object.values(q.translations?.en?.options || {}),
        hindi_question: q.translations?.hi?.question || "",
        hindi_options: Object.values(q.translations?.hi?.options || {}),
        hi_translated: q.translations?.hi?.translated || false,
        answer: q.correct_answer || ""
    }));
    buildEditor(editSetQuestions, "edit-editor-container", "e");
    document.getElementById("new-questions-editor").style.display = "none";
    document.getElementById("add-file-input").value = "";
    document.getElementById("add-file-preview").innerHTML = "";
    document.getElementById("add-upload-status").innerHTML = "";
    document.getElementById("add-extract-btn").disabled = true;
    alert(` ${newQ.length} questions added successfully!`);
}

async function viewSet(id) {
    const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${id}`);
    const s = await res.json();

    document.getElementById("view-set-title").innerHTML =
        `<i class="bi bi-eye me-2"></i>${s.name} — ${s.questions?.length || 0} Questions`;

    document.getElementById("view-set-body").innerHTML = `
      <div class="mb-3">
        <span class="meta-badge me-2"><i class="bi bi-upload me-1"></i>Uploaded by ${s.created_by} on ${s.created_at?.split(" ")[0] || ""}</span>
        ${s.updated_by !== s.created_by ? `<span class="meta-badge"><i class="bi bi-pencil me-1"></i>Last edited by ${s.updated_by} on ${s.updated_at?.split(" ")[0] || ""}</span>` : ""}
      </div>
      ${(s.questions || []).map((q, i) => {
        const en = q.translations?.en || {};
        const hi = q.translations?.hi || {};
        return `<div class="card mb-2 border">
          <div class="card-body py-2 px-3">
            <div class="fw-semibold small">Q${i + 1}. ${en.question || ""}</div>
            <div class="hi-font text-muted small mt-1">${hi.question || ""}</div>
            <div class="d-flex gap-2 mt-2 flex-wrap">
              ${Object.entries(en.options || {}).map(([k, v]) =>
            `<span class="badge ${q.correct_answer === k ? "bg-success" : "bg-light text-dark"}">${k}: ${v}</span>`
        ).join("")}
            </div>
            <div class="small mt-1 text-muted">
              Answer: <strong class="text-dark">${q.correct_answer || "—"}</strong>
              ${hi.translated ? '<span class="translated-badge ms-2">🤖 Translated</span>' : ''}
              ${q.uploaded_by ? `<span class="meta-badge ms-2">By ${q.uploaded_by}</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join("")}`;

    showSection("view-set");
}

async function editSet(id) {
    editSetId = id;
    const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${id}`);
    const s = await res.json();

    editSetQuestions = (s.questions || []).map(q => ({
        question: q.translations?.en?.question || "",
        options: Object.values(q.translations?.en?.options || {}),
        hindi_question: q.translations?.hi?.question || "",
        hindi_options: Object.values(q.translations?.hi?.options || {}),
        hi_translated: q.translations?.hi?.translated || false,
        answer: q.correct_answer || ""
    }));

    document.getElementById("new-questions-editor").style.display = "none";
    document.getElementById("add-file-input").value = "";
    document.getElementById("add-file-preview").innerHTML = "";
    document.getElementById("add-upload-status").innerHTML = "";
    document.getElementById("add-extract-btn").disabled = true;

    buildEditor(editSetQuestions, "edit-editor-container", "e");
    showSection("edit-set");
}

async function updateSet() {
    const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}`);
    const s = await res.json();

    const updated = (s.questions || []).map((q, qi) => {
        const p = "e" + qi;
        const enOpts = {}, hiOpts = {};
        LABELS.forEach((lbl, oi) => {
            enOpts[lbl] = document.getElementById(`en-opt-${p}-${oi}`)?.value.trim() || "";
            hiOpts[lbl] = document.getElementById(`hi-opt-${p}-${oi}`)?.value.trim() || "";
        });
        return {
            ...q,
            translations: {
                en: { question: document.getElementById(`en-q-${p}`)?.value.trim() || "", options: enOpts, explanation: "" },
                hi: { question: document.getElementById(`hi-q-${p}`)?.value.trim() || "", options: hiOpts, explanation: "", translated: q.translations?.hi?.translated || false }
            },
            correct_answer: document.getElementById(`ans-${p}`)?.value || q.correct_answer
        };
    });

    s.questions = updated;
    await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s)
    });

    await openCourse(currentCourse.id);
    showSection("course-detail");
}

async function deleteSet(id) {
    if (!confirm("Delete this question set?")) return;
    await fetch(`/api/courses/${currentCourse.id}/question_sets/${id}`, { method: "DELETE" });
    await openCourse(currentCourse.id);
}

async function startQuiz(id) {
    const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${id}`);
    const s = await res.json();
    quizQuestions = (s.questions || []).map(q => ({
        question: q.translations?.en?.question || "",
        options: Object.values(q.translations?.en?.options || {}),
        hindi_question: q.translations?.hi?.question || "",
        hindi_options: Object.values(q.translations?.hi?.options || {}),
        answer: q.correct_answer || ""
    }));
    userAnswers = {};
    buildQuiz();
    showSection("quiz");
}

function buildQuiz() {
    const c = document.getElementById("questions-container");
    c.innerHTML = "";
    quizQuestions.forEach((q, qi) => {
        const opts = q.options.map((opt, oi) =>
            `<button class="opt-quiz-btn" id="oq-${qi}-${oi}" onclick="selOpt(${qi},${oi})">
          <span class="opt-circle">${LABELS[oi]}</span><span>${opt}</span>
        </button>`).join("");
        const hiPart = q.hindi_question ? `
        <div class="mt-3 pt-3 border-top">
          <span class="badge mb-2" style="background:#f3e8ff;color:#7c3aed;">हिंदी</span>
          <div class="hi-font fw-medium mb-2">${q.hindi_question}</div>
          ${(q.hindi_options || []).map((opt, oi) => `
            <div class="hi-font d-flex align-items-center gap-2 border rounded p-2 mb-2 bg-light">
              <span class="opt-circle">${LABELS[oi]}</span><span>${opt}</span>
            </div>`).join("")}
        </div>` : "";
        c.innerHTML += `
        <div class="card mb-3 border">
          <div class="card-body">
            <p class="text-uppercase text-muted small fw-semibold mb-1">Question ${qi + 1} of ${quizQuestions.length}</p>
            <span class="badge mb-2" style="background:#f3e8ff;color:#7c3aed;">English</span>
            <p class="fw-medium mb-3">${q.question}</p>
            ${opts}${hiPart}
            <div id="fb-${qi}"></div>
          </div>
        </div>`;
    });
    updateProg();
}

function selOpt(qi, oi) {
    userAnswers[qi] = oi;
    quizQuestions[qi].options.forEach((_, i) => document.getElementById(`oq-${qi}-${i}`).classList.remove("selected"));
    document.getElementById(`oq-${qi}-${oi}`).classList.add("selected");
    updateProg();
}

function updateProg() {
    const done = Object.keys(userAnswers).length, total = quizQuestions.length;
    document.getElementById("prog-fill").style.width = Math.round((done / total) * 100) + "%";
    document.getElementById("prog-label").textContent = `${done} / ${total} answered`;
}

async function submitQuiz() {
    if (!Object.keys(userAnswers).length) { alert("Please answer at least one question."); return; }
    const res = await fetch("/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: userAnswers, questions: quizQuestions }) });
    const data = await res.json();
    showResult(data);
}

function showResult(data) {
    document.getElementById("score-display").textContent = `${data.score} / ${data.total}`;
    const g = data.percentage >= 80 ? "Excellent!" : data.percentage >= 60 ? "Pass" : "Needs more practice";
    document.getElementById("score-sub").textContent = `${data.percentage}% — ${g}`;
    document.getElementById("review").innerHTML = data.results.map((r, i) => {
        const opts = r.options.map((opt, oi) => {
            let cls = "";
            if (r.correct_answer >= 0 && oi === r.correct_answer) cls = "correct";
            else if (oi === r.user_answer && oi !== r.correct_answer && r.correct_answer >= 0) cls = "wrong";
            return `<button class="opt-quiz-btn ${cls}" disabled><span class="opt-circle">${LABELS[oi]}</span><span>${opt}</span></button>`;
        }).join("");
        const fb = r.correct_answer === -1 ? "" : r.is_correct ?
            `<div class="text-success fw-semibold small mt-2">✓ Correct</div>` :
            `<div class="text-danger fw-semibold small mt-2">✗ Incorrect</div>`;
        return `<div class="card mb-3 border"><div class="card-body">
        <p class="text-uppercase text-muted small fw-semibold mb-1">Question ${i + 1}</p>
        <p class="fw-medium mb-3">${r.question}</p>${opts}${fb}
      </div></div>`;
    }).join("");
    showSection("result");
}

(async () => {
    const res = await fetch("/api/me");
    if (res.ok) {
        const user = await res.json();
        if (user && user.id) {
            currentUser = user;
            document.getElementById("nav-user-name").textContent = "👤 " + currentUser.name;
            document.getElementById("page-login").style.display = "none";
            document.getElementById("page-app").style.display = "block";
            loadCourses();
        }
    }
})();


function toggleSidebar(){
    document.querySelector(".sidebar").classList.toggle("show");
}

document.addEventListener("click", function(e){

    const sidebar = document.querySelector(".sidebar");
    const menuBtn = document.querySelector(".mobile-menu-btn");

    if(window.innerWidth <= 991){

        if(
            sidebar &&
            menuBtn &&
            !sidebar.contains(e.target) &&
            !menuBtn.contains(e.target)
        ){
            sidebar.classList.remove("show");
        }
    }
});