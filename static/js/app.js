let currentUser   = null;
let currentCourse = null;
let currentSet    = {};
let questions     = [];
let editSetId     = null;
let editSetQuestions    = [];
let newExtractedQuestions = [];
let quizQuestions = [];
let userAnswers   = {};
let currentQuizSetId    = null;
let currentQuizSetName  = "";
const LABELS = ["A","B","C","D"];
let quizTimerInterval = null;
let quizTimerSeconds  = 0;
let quizTimerElapsed  = 0;

function showRegister() {
  document.getElementById("login-form").style.display    = "none";
  document.getElementById("register-form").style.display = "block";
  document.getElementById("login-alert").innerHTML = "";
}
function showLogin() {
  document.getElementById("register-form").style.display = "none";
  document.getElementById("login-form").style.display    = "block";
  document.getElementById("login-alert").innerHTML = "";
}

async function doLogin() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  if (!username || !password) { showAlert("login-alert","Please fill all fields","danger"); return; }
  const res  = await fetch("/api/login",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username,password}) });
  const data = await res.json();
  if (data.error) { showAlert("login-alert",data.error,"danger"); return; }
  currentUser = data.user;
  afterLogin();
}

async function doRegister() {
  const name     = document.getElementById("reg-name").value.trim();
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const role     = document.getElementById("reg-role").value;   // Feature 10
  if (!name || !username || !password) { showAlert("login-alert","Please fill all fields","danger"); return; }
  const res  = await fetch("/api/register",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name,username,password,role}) });
  const data = await res.json();
  if (data.error) { showAlert("login-alert",data.error,"danger"); return; }
  showAlert("login-alert","Registered! Please sign in.","success");
  showLogin();
}

async function doLogout() {
  await fetch("/api/logout",{method:"POST"});
  currentUser = null; currentCourse = null;
  document.getElementById("page-app").style.display   = "none";
  document.getElementById("page-login").style.display = "flex";
}

function afterLogin() {
  const roleBadge = currentUser.role === "student"
    ? `<span class="role-badge-student">Student</span>`
    : `<span class="role-badge-teacher">Teacher</span>`;
  document.getElementById("nav-user-name").innerHTML =
    `👤 ${currentUser.name} ${roleBadge}`;
  document.getElementById("page-login").style.display = "none";
  document.getElementById("page-app").style.display   = "block";

  const teacherOnly = ["sb-new-course","sb-skills","sb-lessons","sb-qsets"];
  teacherOnly.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = currentUser.role === "teacher" ? "" : "none";
  });

  if (currentUser.role === "student") {
    showStudentDashboard();
  } else {
    loadCourses();
  }
}

function showAlert(id,msg,type) {
  document.getElementById(id).innerHTML = `<div class="alert alert-${type} py-2 small">${msg}</div>`;
}

function showSection(name) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const sec = document.getElementById("sec-"+name);
  if (sec) sec.classList.add("active");
  document.querySelectorAll(".sidebar .nav-link").forEach(s => s.classList.remove("active"));
  const sb = document.getElementById("sb-"+name);
  if (sb) sb.classList.add("active");

  const titles = {
    "courses":       ["All Courses",        "Home › Courses"],
    "new-course":    ["New Course",          "Home › Courses › New"],
    "course-detail": ["Course Detail",       `Home › Courses › ${currentCourse?.name||""}`],
    "skills":        ["Skills",              `Home › Courses › ${currentCourse?.name||""} › Skills`],
    "lessons":       ["Lessons",             `Home › Courses › ${currentCourse?.name||""} › Lessons`],
    "qsets":         ["Question Sets",       `Home › Courses › ${currentCourse?.name||""} › Question Sets`],
    "edit-set":      ["Edit Question Set",   `Home › Courses › ${currentCourse?.name||""} › Edit`],
    "view-set":      ["View Question Set",   `Home › Courses › ${currentCourse?.name||""} › View`],
    "quiz":          ["Quiz",                "Home › Quiz"],
    "result":        ["Result",              "Home › Result"],
    "history":       ["Attempt History",     "Home › History"],
    "search":        ["Question Bank Search","Home › Search"],
    "analytics":     ["Analytics Dashboard", "Home › Analytics"],
    "student-home":  ["My Quizzes",          "Home › My Quizzes"],
  };
  const t = titles[name] || ["MCQ Portal","Home"];
  document.getElementById("page-title").textContent     = t[0];
  document.getElementById("page-breadcrumb").textContent = t[1];

  if (name === "qsets")    populateSetDropdowns();
  if (name === "history")  loadHistory();
  if (name === "analytics") loadAnalytics();
  window.scrollTo(0,0);
}

function showCourseNav() {
  ["sb-course-detail","sb-skills","sb-lessons","sb-qsets"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = currentUser?.role === "teacher" ? "block" : "none";
  });
  document.getElementById("sb-course-detail").style.display = "block";
  document.getElementById("course-tag").style.display = "inline-block";
  document.getElementById("course-tag").textContent   = "📘 " + currentCourse.name;
}

async function loadCourses() {
  const res     = await fetch("/api/courses");
  const courses = await res.json();
  const el      = document.getElementById("courses-list");
  if (!courses.length) {
    el.innerHTML = `<div class="text-center py-5 text-muted">
      <i class="bi bi-journal-x" style="font-size:3rem;"></i>
      <p class="mt-3">No courses yet. Create your first course!</p>
      <button class="btn text-white mt-2" style="background:#7c3aed;" onclick="showSection('new-course')">
        <i class="bi bi-plus-lg me-1"></i>Create Course
      </button></div>`;
    return;
  }
  el.innerHTML = courses.map(c => `
    <div class="course-card" onclick="openCourse(${c.id})">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <h6 class="fw-semibold mb-1">${c.name}
            <span class="badge bg-light text-dark fw-normal ms-1">${c.code||""}</span>
          </h6>
          <div class="text-muted small mb-2">${c.subject} · ${c.difficulty}</div>
          <div class="d-flex gap-2 flex-wrap">
            <span class="badge bg-light text-dark"><i class="bi bi-star me-1"></i>${c.skills?.length||0} Skills</span>
            <span class="badge bg-light text-dark"><i class="bi bi-book me-1"></i>${c.lessons?.length||0} Lessons</span>
            <span class="badge bg-light text-dark"><i class="bi bi-folder me-1"></i>${c.question_sets?.length||0} Sets</span>
          </div>
        </div>
        <div class="text-end">
          <div class="meta-badge mb-1">Created by ${c.created_by}</div>
          <div class="text-muted" style="font-size:0.7rem;">${c.created_at?.split(" ")[0]||""}</div>
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
  const totalQ = (c.question_sets||[]).reduce((a,s)=>a+(s.questions?.length||0),0);
  document.getElementById("cd-skills-count").textContent  = c.skills?.length||0;
  document.getElementById("cd-lessons-count").textContent = c.lessons?.length||0;
  document.getElementById("cd-sets-count").textContent    = c.question_sets?.length||0;
  document.getElementById("cd-q-count").textContent       = totalQ;

  document.getElementById("course-detail-body").innerHTML = `
    <div class="row g-3">
      <div class="col-md-4"><strong class="small text-muted">Course Name</strong><div>${c.name}</div></div>
      <div class="col-md-4"><strong class="small text-muted">Code</strong><div>${c.code||"—"}</div></div>
      <div class="col-md-4"><strong class="small text-muted">Subject</strong><div>${c.subject}</div></div>
      <div class="col-md-4"><strong class="small text-muted">Difficulty</strong><div>${c.difficulty}</div></div>
      <div class="col-md-4"><strong class="small text-muted">Marks/Question</strong><div>${c.marks}</div></div>
      <div class="col-md-4"><strong class="small text-muted">Description</strong><div>${c.description||"—"}</div></div>
      <div class="col-12">
        <span class="meta-badge me-2"><i class="bi bi-person-fill me-1"></i>Created by ${c.created_by} on ${c.created_at?.split(" ")[0]||""}</span>
        <span class="meta-badge"><i class="bi bi-pencil-fill me-1"></i>Last updated by ${c.updated_by} on ${c.updated_at?.split(" ")[0]||""}</span>
      </div>
    </div>`;

  renderCourseSets();
  renderSkillsList(c.skills||[]);
  renderLessonsList(c.lessons||[]);
}

function renderCourseSets() {
  const c  = currentCourse;
  const el = document.getElementById("course-sets-list");
  if (!c.question_sets?.length) {
    el.innerHTML = '<p class="text-muted small">No question sets yet.</p>';
    return;
  }
  el.innerHTML = c.question_sets.map(s => {
    const diffMap = {easy:"diff-easy",medium:"diff-medium",hard:"diff-hard"};
    const diffBadge = s.difficulty
      ? `<span class="${diffMap[s.difficulty]||"meta-badge"}">${s.difficulty}</span>` : "";
    return `
    <div class="set-card">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <div class="fw-semibold">${s.name}
            <span class="badge bg-light text-dark fw-normal ms-1">${s.type||""}</span>
            ${diffBadge}
          </div>
          <div class="text-muted small mt-1">
            Questions: ${s.questions?.length||0} &nbsp;|&nbsp;
            Marks: ${s.questions?.reduce((a,q)=>a+(q.marks||1),0)||0}
          </div>
          <div class="mt-1">
            <span class="meta-badge me-1"><i class="bi bi-upload me-1"></i>By ${s.created_by}</span>
          </div>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-outline-secondary" onclick="exportPDF(${s.id})"><i class="bi bi-file-pdf me-1"></i>PDF</button>
          <button class="btn btn-sm btn-outline-success" onclick="exportExcel(${s.id})"><i class="bi bi-file-excel me-1"></i>Excel</button>
          <button class="btn btn-sm btn-outline-primary" onclick="viewSet(${s.id})"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="editSet(${s.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm text-white" style="background:#7c3aed;" onclick="startQuiz(${s.id},'${esc(s.name)}')"><i class="bi bi-play-fill"></i> Quiz</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSet(${s.id})"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join("");
}

async function createCourse() {
  const name = document.getElementById("nc-name").value.trim();
  const subj = document.getElementById("nc-subject").value.trim();
  const diff = document.getElementById("nc-difficulty").value;
  if (!name||!subj||!diff) { alert("Please fill all required fields."); return; }
  const res  = await fetch("/api/courses",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      name, code:document.getElementById("nc-code").value.trim(),
      subject:subj, difficulty:diff,
      marks:parseInt(document.getElementById("nc-marks").value)||1,
      description:document.getElementById("nc-desc").value.trim()
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
  document.getElementById("nc-name").value       = c.name;
  document.getElementById("nc-code").value       = c.code||"";
  document.getElementById("nc-subject").value    = c.subject;
  document.getElementById("nc-difficulty").value = c.difficulty;
  document.getElementById("nc-marks").value      = c.marks;
  document.getElementById("nc-desc").value       = c.description||"";
  showSection("new-course");
  const btn = document.querySelector("#sec-new-course .card-footer .btn:last-child");
  btn.textContent = "Update Course";
  btn.onclick     = updateCourse;
}

async function updateCourse() {
  await fetch(`/api/courses/${currentCourse.id}`,{
    method:"PUT", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      name:document.getElementById("nc-name").value.trim(),
      code:document.getElementById("nc-code").value.trim(),
      subject:document.getElementById("nc-subject").value.trim(),
      difficulty:document.getElementById("nc-difficulty").value,
      marks:parseInt(document.getElementById("nc-marks").value)||1,
      description:document.getElementById("nc-desc").value.trim()
    })
  });
  await openCourse(currentCourse.id);
}

async function addSkill() {
  const name = document.getElementById("skill-name").value.trim();
  const desc = document.getElementById("skill-desc").value.trim();
  if (!name||!desc) { alert("Please fill Skill Name and Description."); return; }
  await fetch(`/api/courses/${currentCourse.id}/skills`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,description:desc})
  });
  const r = await fetch(`/api/courses/${currentCourse.id}`);
  currentCourse = await r.json();
  document.getElementById("skill-name").value = "";
  document.getElementById("skill-desc").value = "";
  renderSkillsList(currentCourse.skills);
  alert("Skill added!");
}

function renderSkillsList(skills) {
  const el = document.getElementById("skills-list");
  if (!skills.length) { el.innerHTML='<p class="text-muted small">No skills added yet.</p>'; return; }
  el.innerHTML = skills.map(s=>`
    <div class="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
      <div><strong>${s.name}</strong> <span class="text-muted small ms-2">${s.description}</span></div>
      <span class="meta-badge">By ${s.added_by||"—"}</span>
    </div>`).join("");
}

async function addLesson() {
  const name    = document.getElementById("lesson-name").value.trim();
  const summary = document.getElementById("lesson-summary").value.trim();
  const slno    = document.getElementById("lesson-slno").value;
  if (!name||!summary) { alert("Please fill Lesson Name and Summary."); return; }
  await fetch(`/api/courses/${currentCourse.id}/lessons`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({sl_no:slno,name,summary})
  });
  const r = await fetch(`/api/courses/${currentCourse.id}`);
  currentCourse = await r.json();
  document.getElementById("lesson-name").value    = "";
  document.getElementById("lesson-summary").value = "";
  document.getElementById("lesson-slno").value    = currentCourse.lessons.length+1;
  renderLessonsList(currentCourse.lessons);
  alert("Lesson added!");
}

function renderLessonsList(lessons) {
  const el = document.getElementById("lessons-list");
  if (!lessons.length) { el.innerHTML='<p class="text-muted small">No lessons added yet.</p>'; return; }
  el.innerHTML = lessons.map(l=>`
    <div class="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
      <div><strong>${l.sl_no}. ${l.name}</strong> <span class="text-muted small ms-2">${l.summary}</span></div>
      <span class="meta-badge">By ${l.added_by||"—"}</span>
    </div>`).join("");
}

function goQsStep(n) {
  [1,2,3,4].forEach(i => {
    document.getElementById(`qs-step-${i}`).style.display = i===n?"block":"none";
  });
  for (let i=1;i<=4;i++) {
    const el = document.getElementById("stp-"+i);
    if (!el) continue;
    el.classList.remove("active","done");
    if (i<n) el.classList.add("done");
    if (i===n) el.classList.add("active");
  }
  if (n===1) populateSetDropdowns();
  window.scrollTo(0,0);
}

async function populateSetDropdowns() {
  const res = await fetch(`/api/courses/${currentCourse.id}`);
  currentCourse = await res.json();
  const sl = document.getElementById("set-lesson");
  const ss = document.getElementById("set-skill");
  const lessons = currentCourse.lessons||[];
  const skills  = currentCourse.skills||[];
  sl.innerHTML = '<option value="">Select Lesson</option>' +
    lessons.map(l=>`<option value="${l.id}">${l.sl_no}. ${l.name}</option>`).join("");
  ss.innerHTML = '<option value="">Select Skill</option>' +
    skills.map(s=>`<option value="${s.id}">${s.name}</option>`).join("");
}

function resetSetForm() {
  document.getElementById("set-name").value       = "";
  document.getElementById("set-type").value       = "";
  document.getElementById("set-difficulty").value = "";
  document.getElementById("set-marks").value      = "1";
  document.getElementById("file-input").value     = "";
  document.getElementById("file-preview-list").innerHTML = "";
  document.getElementById("upload-status").innerHTML     = "";
  document.getElementById("extract-btn").disabled = true;
  questions = [];
}

function previewFiles(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  document.getElementById("file-preview-list").innerHTML = files.map(f=>
    `<div class="d-flex align-items-center gap-2 border rounded p-2 mb-1 small">
      <i class="bi bi-file-earmark-text text-primary"></i>
      <span>${f.name}</span>
      <span class="badge bg-light text-dark ms-auto">${(f.size/1024).toFixed(1)} KB</span>
    </div>`).join("");
  document.getElementById("extract-btn").disabled = false;
  document.getElementById("upload-status").innerHTML = "";
}

function previewAddFiles(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  document.getElementById("add-file-preview").innerHTML = files.map(f=>
    `<div class="d-flex align-items-center gap-2 border rounded p-1 mb-1 small">
      <i class="bi bi-file-earmark-text text-primary"></i><span>${f.name}</span>
    </div>`).join("");
  document.getElementById("add-extract-btn").disabled = false;
}

const dz = document.getElementById("drop-zone");
dz.addEventListener("dragover", e=>{ e.preventDefault(); dz.style.borderColor="#7c3aed"; });
dz.addEventListener("dragleave",()=>{ dz.style.borderColor=""; });
dz.addEventListener("drop", e=>{
  e.preventDefault(); dz.style.borderColor="";
  const inp = document.getElementById("file-input");
  inp.files = e.dataTransfer.files;
  previewFiles(inp);
});

const adz = document.getElementById("add-drop-zone");
adz.addEventListener("dragover", e=>{ e.preventDefault(); adz.style.borderColor="#7c3aed"; });
adz.addEventListener("dragleave",()=>{ adz.style.borderColor=""; });
adz.addEventListener("drop", e=>{
  e.preventDefault(); adz.style.borderColor="";
  const inp = document.getElementById("add-file-input");
  inp.files = e.dataTransfer.files;
  previewAddFiles(inp);
});

function setStatus(id, msg, type) {
  const map = {info:"alert-info",success:"alert-success",danger:"alert-danger"};
  document.getElementById(id).innerHTML =
    `<div class="alert ${map[type]||"alert-info"} small">${msg}</div>`;
}

async function extractQuestions() {
  const name = document.getElementById("set-name").value.trim();
  const type = document.getElementById("set-type").value;
  if (!name||!type) { alert("Please fill Set Name and Assessment Type first."); goQsStep(1); return; }

  currentSet = {
    name, type,
    difficulty: document.getElementById("set-difficulty").value,
    marks:      parseInt(document.getElementById("set-marks").value)||1,
    lesson_id:  document.getElementById("set-lesson").value ? parseInt(document.getElementById("set-lesson").value) : null,
    skill_id:   document.getElementById("set-skill").value  ? parseInt(document.getElementById("set-skill").value)  : null,
    questions: []
  };

  const btn = document.getElementById("extract-btn");
  btn.disabled = true;
  setStatus("upload-status",'<span class="spinner-border spinner-border-sm me-2"></span>Extracting and translating…',"info");

  const fd = new FormData();
  Array.from(document.getElementById("file-input").files).forEach(f=>fd.append("files",f));

  try {
    const res  = await fetch("/upload",{method:"POST",body:fd});
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    questions = data.questions;
    if (!questions.length) throw new Error("No questions found.");
    const translated = questions.filter(q=>q.hi_translated).length;
    setStatus("upload-status",
      `<i class="bi bi-check-circle-fill me-2"></i>Extracted ${questions.length} questions.
       ${translated>0?`<span class="translated-badge ms-1">🤖 ${translated} auto-translated</span>`:""}`,
      "success");
    document.getElementById("q-count-label").textContent = `${questions.length} questions`;
    setTimeout(()=>{ buildEditor(questions,"editor-container",""); goQsStep(3); },700);
  } catch(err) {
    setStatus("upload-status",`<i class="bi bi-exclamation-triangle-fill me-2"></i>${err.message}`,"danger");
    btn.disabled = false;
  }
}

async function extractMoreQuestions() {
  const btn = document.getElementById("add-extract-btn");
  btn.disabled = true;
  setStatus("add-upload-status",'<span class="spinner-border spinner-border-sm me-2"></span>Extracting…',"info");
  const fd = new FormData();
  Array.from(document.getElementById("add-file-input").files).forEach(f=>fd.append("files",f));
  try {
    const res  = await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}/add_questions`,{method:"POST",body:fd});
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    newExtractedQuestions = data.questions;
    setStatus("add-upload-status",`<i class="bi bi-check-circle-fill me-2"></i>Found ${data.questions.length} new questions.`,"success");
    buildEditor(newExtractedQuestions,"new-editor-container","n");
    document.getElementById("new-questions-editor").style.display = "block";
  } catch(err) {
    setStatus("add-upload-status",`<i class="bi bi-exclamation-triangle-fill me-2"></i>${err.message}`,"danger");
    btn.disabled = false;
  }
}

async function autoTagAll(prefix, qs) {
  const payload = qs.map((q,qi)=>({
    id: qi,
    question: document.getElementById(`en-q-${prefix+qi}`)?.value||q.question||"",
    options: LABELS.map((_,oi)=>document.getElementById(`en-opt-${prefix+qi}-${oi}`)?.value||"")
  }));
  const res  = await fetch("/api/autotag",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({questions:payload})
  });
  const data = await res.json();
  if (data.tagged) {
    data.tagged.forEach(t=>{
      const el = document.getElementById(`diff-sel-${prefix+t.id}`);
      if (el) el.value = t.difficulty;
    });
    alert("✅ Difficulty auto-tagged for all questions!");
  }
}

function buildEditor(qs, containerId, prefix) {
  const c = document.getElementById(containerId);
  c.innerHTML = "";
  qs.forEach((q,qi)=>{
    const p = prefix+qi;
    const enOpts = LABELS.map((lbl,oi)=>`
      <div class="d-flex align-items-center gap-2 mb-2">
        <div class="opt-label-circle">${lbl}</div>
        <input class="form-control form-control-sm" id="en-opt-${p}-${oi}" value="${esc(q.options&&q.options[oi]||'')}" placeholder="Option ${lbl}">
      </div>`).join("");
    const hiOpts = LABELS.map((lbl,oi)=>`
      <div class="d-flex align-items-center gap-2 mb-2">
        <div class="opt-label-circle">${lbl}</div>
        <input class="form-control form-control-sm hi-font" id="hi-opt-${p}-${oi}" value="${esc(q.hindi_options&&q.hindi_options[oi]||'')}" placeholder="विकल्प ${lbl}">
      </div>`).join("");

    const translatedBadge = q.hi_translated ? `<span class="translated-badge">🤖 Auto Translated</span>`:"";
    const correctVal      = q.answer||"";
    const diffVal         = q.difficulty||"medium";
    const diffMap = {easy:"diff-easy",medium:"diff-medium",hard:"diff-hard"};

    c.innerHTML += `
      <div class="q-editor">
        <div class="q-editor-head">
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-white fw-semibold" style="background:#1e1b4b;">Q${qi+1}</span>
            ${translatedBadge}
            <span class="${diffMap[diffVal]||"meta-badge"}" id="diff-disp-${p}">${diffVal}</span>
          </div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <div class="d-flex gap-1">
              <span class="lang-tab active" id="tab-en-${p}" onclick="swLang('${p}','en')">English</span>
              <span class="lang-tab"        id="tab-hi-${p}" onclick="swLang('${p}','hi')">हिंदी</span>
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
              <textarea class="form-control form-control-sm" id="en-q-${p}" rows="2">${esc(q.question||'')}</textarea>
            </div>
            <label class="form-label fw-semibold small">Options</label>
            ${enOpts}
          </div>
          <div id="panel-hi-${p}" style="display:none">
            <div class="mb-2">
              <label class="form-label fw-semibold small">Question (हिंदी)</label>
              <textarea class="form-control form-control-sm hi-font" id="hi-q-${p}" rows="2">${esc(q.hindi_question||'')}</textarea>
            </div>
            <label class="form-label fw-semibold small">विकल्प</label>
            ${hiOpts}
          </div>

          <div class="row g-2 mt-3 pt-3 border-top align-items-center">
            <div class="col-auto">
              <label class="fw-semibold small mb-0">✅ Correct Answer <span class="req">●</span></label>
              <select class="form-select form-select-sm w-auto mt-1" id="ans-${p}">
                <option value="">-- Select --</option>
                ${LABELS.map(l=>`<option value="${l}" ${correctVal===l?"selected":""}>${l}</option>`).join("")}
              </select>
            </div>
            <div class="col-auto">
              <label class="fw-semibold small mb-0">📊 Difficulty</label>
              <select class="form-select form-select-sm w-auto mt-1" id="diff-sel-${p}" onchange="updateDiffBadge('${p}',this.value)">
                <option value="easy"   ${diffVal==="easy"?"selected":""}>Easy</option>
                <option value="medium" ${diffVal==="medium"?"selected":""}>Medium</option>
                <option value="hard"   ${diffVal==="hard"?"selected":""}>Hard</option>
              </select>
            </div>
            <div class="col-auto">
              <label class="fw-semibold small mb-0">💡 Hint</label>
              <input class="form-control form-control-sm mt-1" id="hint-${p}" value="${esc(q.hint||'')}" placeholder="Optional hint…" style="min-width:160px;">
            </div>
          </div>

          <div class="mt-2">
            <label class="fw-semibold small mb-1">📖 Explanation (shown after quiz)</label>
            <textarea class="form-control form-control-sm" id="expl-${p}" rows="1" placeholder="Optional explanation…">${esc(q.explanation||'')}</textarea>
          </div>
        </div>
      </div>`;
  });

  // Auto-tag button at top of container
  const autoBtn = document.createElement("div");
  autoBtn.className = "mb-3 text-end";
  autoBtn.innerHTML = `<button class="btn btn-sm btn-outline-secondary" onclick="autoTagAll('${prefix}',${JSON.stringify(qs.map(q=>({question:q.question||'',options:q.options||[]})))})">
    <i class="bi bi-magic me-1"></i>Auto-tag Difficulty (All)
  </button>`;
  c.insertBefore(autoBtn, c.firstChild);
}

function updateDiffBadge(p, val) {
  const el = document.getElementById(`diff-disp-${p}`);
  if (!el) return;
  const map = {easy:"diff-easy",medium:"diff-medium",hard:"diff-hard"};
  el.className = map[val]||"meta-badge";
  el.textContent = val;
}

function swLang(p,lang) {
  document.getElementById(`panel-en-${p}`).style.display = lang==="en"?"block":"none";
  document.getElementById(`panel-hi-${p}`).style.display = lang==="hi"?"block":"none";
  document.getElementById(`tab-en-${p}`).classList.toggle("active",lang==="en");
  document.getElementById(`tab-hi-${p}`).classList.toggle("active",lang==="hi");
}

async function manualTranslate(p,direction) {
  try {
    if (direction==="en_to_hi") {
      const enQ = document.getElementById(`en-q-${p}`).value.trim();
      const r   = await fetch("/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:enQ,direction:"en_to_hi"})});
      const d   = await r.json();
      document.getElementById(`hi-q-${p}`).value = d.translated||"";
      for (let oi=0;oi<4;oi++) {
        const enOpt = document.getElementById(`en-opt-${p}-${oi}`).value.trim();
        if (enOpt) {
          const r2 = await fetch("/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:enOpt,direction:"en_to_hi"})});
          const d2 = await r2.json();
          document.getElementById(`hi-opt-${p}-${oi}`).value = d2.translated||"";
        }
      }
      swLang(p,"hi");
    } else {
      const hiQ = document.getElementById(`hi-q-${p}`).value.trim();
      const r   = await fetch("/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:hiQ,direction:"hi_to_en"})});
      const d   = await r.json();
      document.getElementById(`en-q-${p}`).value = d.translated||"";
      for (let oi=0;oi<4;oi++) {
        const hiOpt = document.getElementById(`hi-opt-${p}-${oi}`).value.trim();
        if (hiOpt) {
          const r2 = await fetch("/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:hiOpt,direction:"hi_to_en"})});
          const d2 = await r2.json();
          document.getElementById(`en-opt-${p}-${oi}`).value = d2.translated||"";
        }
      }
      swLang(p,"en");
    }
  } catch(err) { alert("Translation failed: "+err.message); }
}

function esc(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function readEditorQuestions(qs,prefix) {
  return qs.map((q,qi)=>{
    const p = prefix+qi;
    const enOpts={}, hiOpts={};
    LABELS.forEach((lbl,oi)=>{
      enOpts[lbl] = document.getElementById(`en-opt-${p}-${oi}`)?.value.trim()||"";
      hiOpts[lbl] = document.getElementById(`hi-opt-${p}-${oi}`)?.value.trim()||"";
    });
    return {
      id: qi+1,
      question_type: "multiple_choice",
      translations: {
        en:{ question:document.getElementById(`en-q-${p}`)?.value.trim()||"", options:enOpts, explanation:document.getElementById(`expl-${p}`)?.value.trim()||"", translated:false },
        hi:{ question:document.getElementById(`hi-q-${p}`)?.value.trim()||"", options:hiOpts, explanation:"", translated:q.hi_translated||false }
      },
      correct_answer: document.getElementById(`ans-${p}`)?.value||"",
      difficulty:     document.getElementById(`diff-sel-${p}`)?.value||"medium",  // Feature 6
      hint:           document.getElementById(`hint-${p}`)?.value.trim()||"",     // Feature 7
      marks:          currentSet.marks||1,
      subject:        currentCourse?.subject||"",
      uploaded_by:    currentUser?.name||"",
      uploaded_at:    new Date().toLocaleString()
    };
  });
}

async function saveAll() {
  const finalQ = readEditorQuestions(questions,"");
  currentSet.questions = finalQ;
  const res  = await fetch(`/api/courses/${currentCourse.id}/question_sets`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({question_set:currentSet})
  });
  const data = await res.json();
  if (data.error) { alert("Save failed: "+data.error); return; }
  document.getElementById("saved-summary").textContent =
    `${finalQ.length} questions saved under "${currentSet.name}"`;
  await openCourse(currentCourse.id);
  goQsStep(4);
}

async function appendNewQuestions() {
  const newQ = readEditorQuestions(newExtractedQuestions,"n");
  const res  = await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}`);
  const s    = await res.json();
  const existingQ = s.questions||[];
  newQ.forEach((q,i)=>q.id=existingQ.length+i+1);
  s.questions = [...existingQ,...newQ];
  await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}`,{
    method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(s)
  });
  editSetQuestions = s.questions.map(q=>({
    question:     q.translations?.en?.question||"",
    options:      Object.values(q.translations?.en?.options||{}),
    hindi_question: q.translations?.hi?.question||"",
    hindi_options:  Object.values(q.translations?.hi?.options||{}),
    hi_translated:  q.translations?.hi?.translated||false,
    answer:  q.correct_answer||"",
    hint:    q.hint||"",
    difficulty: q.difficulty||"medium",
    explanation: q.translations?.en?.explanation||""
  }));
  buildEditor(editSetQuestions,"edit-editor-container","e");
  document.getElementById("new-questions-editor").style.display = "none";
  alert(`✅ ${newQ.length} questions added!`);
}

async function viewSet(id) {
  const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${id}`);
  const s   = await res.json();
  const diffMap = {easy:"diff-easy",medium:"diff-medium",hard:"diff-hard"};
  document.getElementById("view-set-title").innerHTML =
    `<i class="bi bi-eye me-2"></i>${s.name} — ${s.questions?.length||0} Questions`;

  // Export buttons in view header
  document.getElementById("view-set-export").innerHTML = `
    <button class="btn btn-sm btn-outline-secondary me-2" onclick="exportPDF(${id})">
      <i class="bi bi-file-pdf me-1"></i>PDF
    </button>
    <button class="btn btn-sm btn-outline-success" onclick="exportExcel(${id})">
      <i class="bi bi-file-excel me-1"></i>Excel
    </button>`;

  document.getElementById("view-set-body").innerHTML = `
    <div class="mb-3">
      <span class="meta-badge me-2">By ${s.created_by} on ${s.created_at?.split(" ")[0]||""}</span>
    </div>
    ${(s.questions||[]).map((q,i)=>{
      const en   = q.translations?.en||{};
      const hi   = q.translations?.hi||{};
      const diff = q.difficulty||"";
      return `<div class="card mb-2 border">
        <div class="card-body py-2 px-3">
          <div class="fw-semibold small d-flex align-items-center gap-2">
            Q${i+1}. ${en.question||""}
            ${diff?`<span class="${diffMap[diff]||'meta-badge'}">${diff}</span>`:""}
          </div>
          <div class="hi-font text-muted small mt-1">${hi.question||""}</div>
          <div class="d-flex gap-2 mt-2 flex-wrap">
            ${Object.entries(en.options||{}).map(([k,v])=>
              `<span class="badge ${q.correct_answer===k?"bg-success":"bg-light text-dark"}">${k}: ${v}</span>`
            ).join("")}
          </div>
          <div class="small mt-1 text-muted">
            Answer: <strong class="text-dark">${q.correct_answer||"—"}</strong>
            ${q.hint?`<span class="ms-2">💡 ${q.hint}</span>`:""}
          </div>
          ${en.explanation?`<div class="explanation-box mt-2">📖 ${en.explanation}</div>`:""}
        </div>
      </div>`;
    }).join("")}`;
  showSection("view-set");
}

async function editSet(id) {
  editSetId = id;
  const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${id}`);
  const s   = await res.json();
  editSetQuestions = (s.questions||[]).map(q=>({
    question:      q.translations?.en?.question||"",
    options:       Object.values(q.translations?.en?.options||{}),
    hindi_question:q.translations?.hi?.question||"",
    hindi_options: Object.values(q.translations?.hi?.options||{}),
    hi_translated: q.translations?.hi?.translated||false,
    answer:        q.correct_answer||"",
    difficulty:    q.difficulty||"medium",
    hint:          q.hint||"",
    explanation:   q.translations?.en?.explanation||""
  }));
  document.getElementById("new-questions-editor").style.display = "none";
  document.getElementById("add-file-input").value = "";
  document.getElementById("add-file-preview").innerHTML  = "";
  document.getElementById("add-upload-status").innerHTML = "";
  document.getElementById("add-extract-btn").disabled = true;
  buildEditor(editSetQuestions,"edit-editor-container","e");
  showSection("edit-set");
}

async function updateSet() {
  const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}`);
  const s   = await res.json();
  const updated = (s.questions||[]).map((q,qi)=>{
    const p = "e"+qi;
    const enOpts={}, hiOpts={};
    LABELS.forEach((lbl,oi)=>{
      enOpts[lbl] = document.getElementById(`en-opt-${p}-${oi}`)?.value.trim()||"";
      hiOpts[lbl] = document.getElementById(`hi-opt-${p}-${oi}`)?.value.trim()||"";
    });
    return {
      ...q,
      translations:{
        en:{ question:document.getElementById(`en-q-${p}`)?.value.trim()||"", options:enOpts, explanation:document.getElementById(`expl-${p}`)?.value.trim()||"" },
        hi:{ question:document.getElementById(`hi-q-${p}`)?.value.trim()||"", options:hiOpts, explanation:"", translated:q.translations?.hi?.translated||false }
      },
      correct_answer: document.getElementById(`ans-${p}`)?.value||q.correct_answer,
      difficulty:     document.getElementById(`diff-sel-${p}`)?.value||q.difficulty||"medium",
      hint:           document.getElementById(`hint-${p}`)?.value.trim()||""
    };
  });
  s.questions = updated;
  await fetch(`/api/courses/${currentCourse.id}/question_sets/${editSetId}`,{
    method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(s)
  });
  await openCourse(currentCourse.id);
  showSection("course-detail");
}

async function deleteSet(id) {
  if (!confirm("Delete this question set?")) return;
  await fetch(`/api/courses/${currentCourse.id}/question_sets/${id}`,{method:"DELETE"});
  await openCourse(currentCourse.id);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 2 & 3: EXPORT PDF / EXCEL
// ═══════════════════════════════════════════════════════════════════════════════

function exportPDF(setId) {
  window.open(`/api/courses/${currentCourse.id}/question_sets/${setId}/export/pdf`,"_blank");
}
function exportExcel(setId) {
  window.open(`/api/courses/${currentCourse.id}/question_sets/${setId}/export/excel`,"_blank");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 1: QUIZ WITH TIMER
// ═══════════════════════════════════════════════════════════════════════════════

async function startQuiz(id, setName) {
  currentQuizSetId   = id;
  currentQuizSetName = setName||"";
  const res = await fetch(`/api/courses/${currentCourse.id}/question_sets/${id}`);
  const s   = await res.json();
  quizQuestions = (s.questions||[]).map(q=>({
    question:      q.translations?.en?.question||"",
    options:       Object.values(q.translations?.en?.options||{}),
    hindi_question:q.translations?.hi?.question||"",
    hindi_options: Object.values(q.translations?.hi?.options||{}),
    answer:        q.correct_answer||"",
    hint:          q.hint||"",
    explanation:   q.translations?.en?.explanation||""
  }));
  userAnswers = {};

  // Show timer setup
  const timerSetup = document.getElementById("quiz-timer-setup");
  timerSetup.style.display = "block";
  document.getElementById("timer-minutes").value = Math.max(5,quizQuestions.length);

  buildQuiz();
  stopTimer();
  showSection("quiz");
}

function startTimer() {
  const mins = parseInt(document.getElementById("timer-minutes").value)||0;
  if (mins <= 0) { stopTimer(); return; }
  quizTimerSeconds = mins * 60;
  quizTimerElapsed = 0;
  document.getElementById("quiz-timer-setup").style.display = "none";
  document.getElementById("quiz-timer-display").style.display = "inline-flex";
  runTimer();
}

function skipTimer() {
  document.getElementById("quiz-timer-setup").style.display   = "none";
  document.getElementById("quiz-timer-display").style.display = "none";
  quizTimerSeconds = 0;
}

function runTimer() {
  clearInterval(quizTimerInterval);
  updateTimerDisplay();
  quizTimerInterval = setInterval(()=>{
    quizTimerSeconds--;
    quizTimerElapsed++;
    updateTimerDisplay();
    if (quizTimerSeconds <= 0) {
      clearInterval(quizTimerInterval);
      alert("⏰ Time's up! Auto-submitting your quiz.");
      submitQuiz(true);
    }
  },1000);
}

function stopTimer() {
  clearInterval(quizTimerInterval);
  quizTimerInterval = null;
  const el = document.getElementById("quiz-timer-display");
  if (el) el.style.display = "none";
}

function updateTimerDisplay() {
  const el = document.getElementById("quiz-timer-display");
  if (!el) return;
  const m = Math.floor(quizTimerSeconds/60);
  const s = quizTimerSeconds%60;
  el.textContent = `⏱ ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  el.className = "quiz-timer";
  if (quizTimerSeconds <= 30) el.classList.add("warning");
  else if (quizTimerSeconds <= 60) el.classList.add("caution");
}

function buildQuiz() {
  const c = document.getElementById("questions-container");
  c.innerHTML = "";
  quizQuestions.forEach((q,qi)=>{
    const opts = q.options.map((opt,oi)=>
      `<button class="opt-quiz-btn" id="oq-${qi}-${oi}" onclick="selOpt(${qi},${oi})">
        <span class="opt-circle">${LABELS[oi]}</span><span>${opt}</span>
      </button>`).join("");

    const hiPart = q.hindi_question?`
      <div class="mt-3 pt-3 border-top">
        <span class="badge mb-2" style="background:#f3e8ff;color:#7c3aed;">हिंदी</span>
        <div class="hi-font fw-medium mb-2">${q.hindi_question}</div>
        ${(q.hindi_options||[]).map((opt,oi)=>`
          <div class="hi-font d-flex align-items-center gap-2 border rounded p-2 mb-2 bg-light">
            <span class="opt-circle">${LABELS[oi]}</span><span>${opt}</span>
          </div>`).join("")}
      </div>`:"";

    // Feature 7: hint button
    const hintPart = q.hint?`
      <div class="mt-2">
        <button class="btn btn-sm btn-outline-secondary" onclick="toggleHint(${qi})">
          <i class="bi bi-lightbulb me-1"></i>Show Hint
        </button>
        <div class="hint-box" id="hint-box-${qi}">💡 ${q.hint}</div>
      </div>`:"";

    c.innerHTML += `
      <div class="card mb-3 border">
        <div class="card-body">
          <p class="text-uppercase text-muted small fw-semibold mb-1">Question ${qi+1} of ${quizQuestions.length}</p>
          <span class="badge mb-2" style="background:#f3e8ff;color:#7c3aed;">English</span>
          <p class="fw-medium mb-3">${q.question}</p>
          ${opts}${hintPart}${hiPart}
          <div id="fb-${qi}"></div>
        </div>
      </div>`;
  });
  updateProg();
}

function toggleHint(qi) {
  const box = document.getElementById(`hint-box-${qi}`);
  if (box) box.classList.toggle("show");
}

function selOpt(qi,oi) {
  userAnswers[qi] = oi;
  quizQuestions[qi].options.forEach((_,i)=>document.getElementById(`oq-${qi}-${i}`).classList.remove("selected"));
  document.getElementById(`oq-${qi}-${oi}`).classList.add("selected");
  updateProg();
}

function updateProg() {
  const done=Object.keys(userAnswers).length, total=quizQuestions.length;
  document.getElementById("prog-fill").style.width = Math.round((done/total)*100)+"%";
  document.getElementById("prog-label").textContent = `${done} / ${total} answered`;
}

async function submitQuiz(autoSubmit=false) {
  if (!autoSubmit && !Object.keys(userAnswers).length) {
    alert("Please answer at least one question."); return;
  }
  stopTimer();
  const timeTaken = quizTimerElapsed || 0;

  const res  = await fetch("/submit",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({answers:userAnswers, questions:quizQuestions})
  });
  const data = await res.json();

  // Feature 4: save attempt
  if (currentUser) {
    await fetch("/api/attempts",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        course_id:   currentCourse?.id,
        course_name: currentCourse?.name||"",
        set_id:      currentQuizSetId,
        set_name:    currentQuizSetName,
        score:       data.score,
        total:       data.total,
        percentage:  data.percentage,
        time_taken:  timeTaken
      })
    });
  }

  showResult(data);
}

// Feature 8: show explanation after submit
function showResult(data) {
  document.getElementById("score-display").textContent = `${data.score} / ${data.total}`;
  const g = data.percentage>=80?"Excellent! 🎉":data.percentage>=60?"Pass ✅":"Needs more practice 📚";
  document.getElementById("score-sub").textContent = `${data.percentage}% — ${g}`;

  document.getElementById("review").innerHTML = data.results.map((r,i)=>{
    const opts = r.options.map((opt,oi)=>{
      let cls="";
      if (r.correct_answer>=0&&oi===r.correct_answer) cls="correct";
      else if (oi===r.user_answer&&oi!==r.correct_answer&&r.correct_answer>=0) cls="wrong";
      return `<button class="opt-quiz-btn ${cls}" disabled>
        <span class="opt-circle">${LABELS[oi]}</span><span>${opt}</span>
      </button>`;
    }).join("");
    const fb = r.correct_answer===-1?"":r.is_correct?
      `<div class="text-success fw-semibold small mt-2">✓ Correct</div>`:
      `<div class="text-danger fw-semibold small mt-2">✗ Incorrect</div>`;

    // Feature 8: explanation
    const expl = r.explanation
      ? `<div class="explanation-box mt-2">📖 ${r.explanation}</div>` : "";

    return `<div class="card mb-3 border"><div class="card-body">
      <p class="text-uppercase text-muted small fw-semibold mb-1">Question ${i+1}</p>
      <p class="fw-medium mb-3">${r.question}</p>
      ${opts}${fb}${expl}
    </div></div>`;
  }).join("");
  showSection("result");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 4: ATTEMPT HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

async function loadHistory() {
  const el  = document.getElementById("history-body");
  el.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">
    <span class="spinner-border spinner-border-sm me-2"></span>Loading…</td></tr>`;

  const res      = await fetch("/api/attempts");
  const attempts = await res.json();

  if (!attempts.length) {
    el.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No attempts yet.</td></tr>`;
    return;
  }

  el.innerHTML = attempts.map(a=>{
    const pill = a.percentage>=60
      ? `<span class="score-pill-pass">${a.percentage}%</span>`
      : `<span class="score-pill-fail">${a.percentage}%</span>`;
    const timeTxt = a.time_taken
      ? `${Math.floor(a.time_taken/60)}m ${a.time_taken%60}s` : "—";
    return `<tr class="attempt-row">
      <td>${a.submitted_at?.split(" ")[0]||""}</td>
      <td>${a.user_name||"—"}</td>
      <td>${a.course_name||"—"}</td>
      <td>${a.set_name||"—"}</td>
      <td>${a.score}/${a.total}</td>
      <td>${pill}</td>
      <td>${timeTxt}</td>
    </tr>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 5: QUESTION BANK SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

let searchTimeout = null;

function onSearchInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(doSearch, 400);
}

async function doSearch() {
  const kw = document.getElementById("search-input").value.trim();
  const resultEl = document.getElementById("search-results");
  if (!kw) { resultEl.innerHTML=""; return; }

  resultEl.innerHTML = `<p class="text-muted small">
    <span class="spinner-border spinner-border-sm me-1"></span>Searching…</p>`;

  const res  = await fetch(`/api/search?q=${encodeURIComponent(kw)}`);
  const data = await res.json();

  if (!data.results.length) {
    resultEl.innerHTML = `<p class="text-muted small">No results for "<strong>${esc(kw)}</strong>"</p>`;
    return;
  }

  const diffMap={easy:"diff-easy",medium:"diff-medium",hard:"diff-hard"};
  resultEl.innerHTML = `<p class="text-muted small mb-3">${data.count} result(s) for "<strong>${esc(kw)}</strong>"</p>`+
    data.results.map(r=>`
      <div class="search-result-card">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-1 mb-1">
          <span class="meta-badge">${r.course_name} › ${r.set_name}</span>
          ${r.difficulty?`<span class="${diffMap[r.difficulty]||"meta-badge"}">${r.difficulty}</span>`:""}
        </div>
        <div class="fw-medium small">${r.question}</div>
        <div class="d-flex gap-2 mt-2 flex-wrap">
          ${(r.options||[]).map((o,i)=>`
            <span class="badge ${LABELS[i]===r.answer?"bg-success":"bg-light text-dark"}">${LABELS[i]}: ${o}</span>`).join("")}
        </div>
        ${r.hint?`<div class="small text-muted mt-1">💡 ${r.hint}</div>`:""}
      </div>`).join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 9: ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

async function loadAnalytics() {
  const res  = await fetch("/api/analytics");
  const data = await res.json();

  document.getElementById("an-total").textContent   = data.total_attempts;
  document.getElementById("an-avg").textContent     = data.avg_score+"%";
  document.getElementById("an-pass").textContent    = data.pass_rate+"%";

  // Pass rate bar
  document.getElementById("an-pass-bar").style.width = data.pass_rate+"%";

  // By set table
  const setTbl = document.getElementById("an-by-set");
  if (!data.by_set?.length) {
    setTbl.innerHTML = `<tr><td colspan="3" class="text-muted text-center">No data yet.</td></tr>`;
  } else {
    setTbl.innerHTML = data.by_set.map(s=>`
      <tr>
        <td>${s.set_name}</td>
        <td>${s.attempts}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="bar-track flex-grow-1"><div class="bar-fill ${s.avg_score>=60?'green':''}" style="width:${s.avg_score}%"></div></div>
            <span class="small fw-semibold">${s.avg_score}%</span>
          </div>
        </td>
      </tr>`).join("");
  }

  // By student (teacher only)
  const stuSection = document.getElementById("an-student-section");
  if (data.by_student?.length && currentUser?.role==="teacher") {
    stuSection.style.display = "block";
    document.getElementById("an-by-student").innerHTML = data.by_student.map(s=>`
      <tr>
        <td>${s.name}</td>
        <td>${s.attempts}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="bar-track flex-grow-1"><div class="bar-fill ${s.avg_score>=60?'green':''}" style="width:${s.avg_score}%"></div></div>
            <span class="small fw-semibold">${s.avg_score}%</span>
          </div>
        </td>
      </tr>`).join("");
  } else {
    stuSection.style.display = "none";
  }

  // Recent attempts
  document.getElementById("an-recent").innerHTML = (data.recent||[]).map(a=>{
    const pill = a.percentage>=60
      ? `<span class="score-pill-pass">${a.percentage}%</span>`
      : `<span class="score-pill-fail">${a.percentage}%</span>`;
    return `<tr>
      <td>${a.submitted_at?.split(" ")[0]||""}</td>
      <td>${a.user_name}</td>
      <td>${a.set_name}</td>
      <td>${a.score}/${a.total}</td>
      <td>${pill}</td>
    </tr>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 10: STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

async function showStudentDashboard() {
  showSection("student-home");
  const res     = await fetch("/api/courses");
  const courses = await res.json();
  const el      = document.getElementById("student-quiz-list");
  if (!courses.length) {
    el.innerHTML = `<p class="text-muted">No quizzes available yet.</p>`; return;
  }
  let html = "";
  for (const c of courses) {
    for (const s of (c.question_sets||[])) {
      const diffMap={easy:"diff-easy",medium:"diff-medium",hard:"diff-hard"};
      html += `
        <div class="student-quiz-card" onclick="openCourseAndQuiz(${c.id},${s.id},'${esc(s.name)}')">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div class="fw-semibold">${s.name}</div>
              <div class="text-muted small">${c.name} · ${c.subject}</div>
              <div class="mt-1 d-flex gap-2">
                <span class="badge bg-light text-dark">${s.questions?.length||0} Questions</span>
                ${s.difficulty?`<span class="${diffMap[s.difficulty]||'meta-badge'}">${s.difficulty}</span>`:""}
                <span class="badge bg-light text-dark">${s.type||""}</span>
              </div>
            </div>
            <button class="btn btn-sm text-white align-self-center" style="background:#7c3aed;">
              <i class="bi bi-play-fill me-1"></i>Start Quiz
            </button>
          </div>
        </div>`;
    }
  }
  el.innerHTML = html || `<p class="text-muted">No question sets available.</p>`;
}

async function openCourseAndQuiz(courseId, setId, setName) {
  const res = await fetch(`/api/courses/${courseId}`);
  currentCourse = await res.json();
  await startQuiz(setId, setName);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MOBILE SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("show");
}
document.addEventListener("click", function(e){
  const sidebar = document.querySelector(".sidebar");
  const menuBtn = document.querySelector(".mobile-menu-btn");
  if (window.innerWidth<=991 && sidebar && menuBtn &&
      !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
    sidebar.classList.remove("show");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT: check session on page load
// ═══════════════════════════════════════════════════════════════════════════════

(async ()=>{
  const res = await fetch("/api/me");
  if (res.ok) {
    const user = await res.json();
    if (user && user.id) {
      currentUser = user;
      afterLogin();
    }
  }
})();