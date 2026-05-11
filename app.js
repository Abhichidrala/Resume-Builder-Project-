/* ======================================================
   ResumeForge — app.js
   State management, live preview, templates, persistence
   ====================================================== */

// ==================== STATE ====================
const defaultState = {
  template: 'modern',
  fullName: '',
  jobTitle: '',
  email: '',
  phone: '',
  location: '',
  website: '',
  github: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: []
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem('resumeforge_data');
    if (saved) return { ...defaultState, ...JSON.parse(saved) };
  } catch (e) { /* ignore */ }
  return { ...defaultState };
}

function saveState() {
  localStorage.setItem('resumeforge_data', JSON.stringify(state));
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  hydrateForm();
  renderPreview();
  bindInputs();
  bindTemplateSelector();
  bindSkillInput();
  bindHeaderActions();
});

// ==================== HYDRATE FORM FROM STATE ====================
function hydrateForm() {
  // Simple fields
  document.querySelectorAll('[data-field]').forEach(el => {
    const key = el.dataset.field;
    if (state[key] !== undefined) el.value = state[key];
  });

  // Template
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.template === state.template);
  });

  // Repeatable sections
  const expList = document.getElementById('experience-list');
  expList.innerHTML = '';
  state.experience.forEach((_, i) => expList.appendChild(createExperienceItem(i)));

  const eduList = document.getElementById('education-list');
  eduList.innerHTML = '';
  state.education.forEach((_, i) => eduList.appendChild(createEducationItem(i)));

  const projList = document.getElementById('projects-list');
  projList.innerHTML = '';
  state.projects.forEach((_, i) => projList.appendChild(createProjectItem(i)));

  const certList = document.getElementById('certifications-list');
  certList.innerHTML = '';
  state.certifications.forEach((_, i) => certList.appendChild(createCertificationItem(i)));

  // Skills tags
  renderSkillTags();
}

// ==================== BIND SIMPLE INPUTS ====================
function bindInputs() {
  document.querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      state[el.dataset.field] = el.value;
      saveState();
      renderPreview();
    });
  });
}

// ==================== TEMPLATE SELECTOR ====================
function bindTemplateSelector() {
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.template = btn.dataset.template;
      saveState();
      renderPreview();
    });
  });
}

// ==================== SECTION TOGGLE ====================
function toggleSection(id) {
  document.getElementById(id).classList.toggle('open');
}

// ==================== SKILLS ====================
function bindSkillInput() {
  const input = document.getElementById('skillInput');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      state.skills.push(input.value.trim());
      input.value = '';
      saveState();
      renderSkillTags();
      renderPreview();
    }
  });
}

function renderSkillTags() {
  const container = document.getElementById('skills-container');
  container.innerHTML = state.skills.map((skill, i) =>
    `<span class="skill-tag">${esc(skill)}<button onclick="removeSkill(${i})">×</button></span>`
  ).join('');
}

function removeSkill(index) {
  state.skills.splice(index, 1);
  saveState();
  renderSkillTags();
  renderPreview();
}

// ==================== REPEATABLE: EXPERIENCE ====================
function createExperienceItem(index) {
  const exp = state.experience[index] || {};
  const div = document.createElement('div');
  div.className = 'repeatable-item';
  div.innerHTML = `
    <button class="remove-item" onclick="removeExperience(${index})">×</button>
    <div class="form-group">
      <label>Job Title</label>
      <input type="text" value="${esc(exp.title || '')}" data-exp="${index}" data-key="title" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Company</label>
        <input type="text" value="${esc(exp.company || '')}" data-exp="${index}" data-key="company" />
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" value="${esc(exp.location || '')}" data-exp="${index}" data-key="location" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Start Date</label>
        <input type="text" value="${esc(exp.startDate || '')}" placeholder="Jan 2022" data-exp="${index}" data-key="startDate" />
      </div>
      <div class="form-group">
        <label>End Date</label>
        <input type="text" value="${esc(exp.endDate || '')}" placeholder="Present" data-exp="${index}" data-key="endDate" />
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea rows="3" data-exp="${index}" data-key="description" placeholder="Key achievements and responsibilities...">${esc(exp.description || '')}</textarea>
    </div>
  `;
  div.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      state.experience[index][el.dataset.key] = el.value;
      saveState();
      renderPreview();
    });
  });
  return div;
}

function addExperience() {
  state.experience.push({ title: '', company: '', location: '', startDate: '', endDate: '', description: '' });
  saveState();
  const list = document.getElementById('experience-list');
  list.appendChild(createExperienceItem(state.experience.length - 1));
  renderPreview();
}

function removeExperience(index) {
  state.experience.splice(index, 1);
  saveState();
  rebuildList('experience-list', state.experience, createExperienceItem);
  renderPreview();
}

// ==================== REPEATABLE: EDUCATION ====================
function createEducationItem(index) {
  const edu = state.education[index] || {};
  const div = document.createElement('div');
  div.className = 'repeatable-item';
  div.innerHTML = `
    <button class="remove-item" onclick="removeEducation(${index})">×</button>
    <div class="form-group">
      <label>Degree</label>
      <input type="text" value="${esc(edu.degree || '')}" data-edu="${index}" data-key="degree" placeholder="B.S. Computer Science" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Institution</label>
        <input type="text" value="${esc(edu.institution || '')}" data-edu="${index}" data-key="institution" />
      </div>
      <div class="form-group">
        <label>Year</label>
        <input type="text" value="${esc(edu.year || '')}" data-edu="${index}" data-key="year" placeholder="2018 – 2022" />
      </div>
    </div>
    <div class="form-group">
      <label>Details (optional)</label>
      <textarea rows="2" data-edu="${index}" data-key="details" placeholder="GPA, honors, relevant coursework...">${esc(edu.details || '')}</textarea>
    </div>
  `;
  div.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      state.education[index][el.dataset.key] = el.value;
      saveState();
      renderPreview();
    });
  });
  return div;
}

function addEducation() {
  state.education.push({ degree: '', institution: '', year: '', details: '' });
  saveState();
  const list = document.getElementById('education-list');
  list.appendChild(createEducationItem(state.education.length - 1));
  renderPreview();
}

function removeEducation(index) {
  state.education.splice(index, 1);
  saveState();
  rebuildList('education-list', state.education, createEducationItem);
  renderPreview();
}

// ==================== REPEATABLE: PROJECTS ====================
function createProjectItem(index) {
  const proj = state.projects[index] || {};
  const div = document.createElement('div');
  div.className = 'repeatable-item';
  div.innerHTML = `
    <button class="remove-item" onclick="removeProject(${index})">×</button>
    <div class="form-row">
      <div class="form-group">
        <label>Project Name</label>
        <input type="text" value="${esc(proj.name || '')}" data-proj="${index}" data-key="name" />
      </div>
      <div class="form-group">
        <label>Link (optional)</label>
        <input type="url" value="${esc(proj.link || '')}" data-proj="${index}" data-key="link" placeholder="https://..." />
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea rows="2" data-proj="${index}" data-key="description" placeholder="What does this project do?">${esc(proj.description || '')}</textarea>
    </div>
  `;
  div.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      state.projects[index][el.dataset.key] = el.value;
      saveState();
      renderPreview();
    });
  });
  return div;
}

function addProject() {
  state.projects.push({ name: '', link: '', description: '' });
  saveState();
  const list = document.getElementById('projects-list');
  list.appendChild(createProjectItem(state.projects.length - 1));
  renderPreview();
}

function removeProject(index) {
  state.projects.splice(index, 1);
  saveState();
  rebuildList('projects-list', state.projects, createProjectItem);
  renderPreview();
}

// ==================== REPEATABLE: CERTIFICATIONS ====================
function createCertificationItem(index) {
  const cert = state.certifications[index] || {};
  const div = document.createElement('div');
  div.className = 'repeatable-item';
  div.innerHTML = `
    <button class="remove-item" onclick="removeCertification(${index})">×</button>
    <div class="form-row">
      <div class="form-group">
        <label>Certification Name</label>
        <input type="text" value="${esc(cert.name || '')}" data-cert="${index}" data-key="name" />
      </div>
      <div class="form-group">
        <label>Issuer</label>
        <input type="text" value="${esc(cert.issuer || '')}" data-cert="${index}" data-key="issuer" />
      </div>
    </div>
    <div class="form-group">
      <label>Date</label>
      <input type="text" value="${esc(cert.date || '')}" data-cert="${index}" data-key="date" placeholder="March 2023" />
    </div>
  `;
  div.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      state.certifications[index][el.dataset.key] = el.value;
      saveState();
      renderPreview();
    });
  });
  return div;
}

function addCertification() {
  state.certifications.push({ name: '', issuer: '', date: '' });
  saveState();
  const list = document.getElementById('certifications-list');
  list.appendChild(createCertificationItem(state.certifications.length - 1));
  renderPreview();
}

function removeCertification(index) {
  state.certifications.splice(index, 1);
  saveState();
  rebuildList('certifications-list', state.certifications, createCertificationItem);
  renderPreview();
}

// ==================== REBUILD LIST HELPER ====================
function rebuildList(containerId, arr, createFn) {
  const list = document.getElementById(containerId);
  list.innerHTML = '';
  arr.forEach((_, i) => list.appendChild(createFn(i)));
}

// ==================== LIVE PREVIEW RENDER ====================
function renderPreview() {
  const page = document.getElementById('resume-page');
  page.className = `resume-page template-${state.template}`;

  const s = state;
  let html = '';

  // Header
  const contactParts = [];
  if (s.email) contactParts.push(`<a href="mailto:${esc(s.email)}" style="color:#000;text-decoration:none;">${esc(s.email)}</a>`);
  if (s.phone) contactParts.push(`<span>${esc(s.phone)}</span>`);
  if (s.location) contactParts.push(`<span>${esc(s.location)}</span>`);
  if (s.website) contactParts.push(`<a href="${esc(s.website)}" target="_blank" style="color:#000;text-decoration:none;">${esc(s.website.replace(/^https?:\/\//, ''))}</a>`);
  if (s.github) contactParts.push(`<a href="${esc(s.github)}" target="_blank" style="color:#000;text-decoration:none;">GitHub: ${esc(s.github.replace(/^https?:\/\//, ''))}</a>`);

  html += `<div class="resume-header">
    <div>
      <div class="resume-name">${esc(s.fullName) || 'Your Name'}</div>
      ${s.jobTitle ? `<div class="resume-title">${esc(s.jobTitle)}</div>` : ''}
    </div>
    <div class="resume-contact">${contactParts.join(s.template === 'modern' ? '<br/>' : ' &nbsp;|&nbsp; ')}</div>
  </div>`;

  // Summary
  if (s.summary) {
    html += `<div class="resume-section">
      <div class="section-title">Summary</div>
      <div class="resume-summary">${esc(s.summary)}</div>
    </div>`;
  }

  // Experience
  if (s.experience.length > 0 && s.experience.some(e => e.title || e.company)) {
    html += `<div class="resume-section"><div class="section-title">Experience</div>`;
    s.experience.forEach(exp => {
      if (!exp.title && !exp.company) return;
      html += `<div class="resume-entry">
        <div class="entry-header">
          <div>
            <div class="entry-title">${esc(exp.title)}</div>
            <div class="entry-subtitle">${esc(exp.company)}${exp.location ? ', ' + esc(exp.location) : ''}</div>
          </div>
          <div class="entry-date">${esc(exp.startDate)}${exp.endDate ? ' – ' + esc(exp.endDate) : ''}</div>
        </div>
        ${exp.description ? `<div class="entry-desc">${formatDesc(exp.description)}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  }

  // Education
  if (s.education.length > 0 && s.education.some(e => e.degree || e.institution)) {
    html += `<div class="resume-section"><div class="section-title">Education</div>`;
    s.education.forEach(edu => {
      if (!edu.degree && !edu.institution) return;
      html += `<div class="resume-entry">
        <div class="entry-header">
          <div>
            <div class="entry-title">${esc(edu.degree)}</div>
            <div class="entry-subtitle">${esc(edu.institution)}</div>
          </div>
          <div class="entry-date">${esc(edu.year)}</div>
        </div>
        ${edu.details ? `<div class="entry-desc">${esc(edu.details)}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  }

  // Skills
  if (s.skills.length > 0) {
    html += `<div class="resume-section">
      <div class="section-title">Skills</div>
      <div class="skills-list">${s.skills.map(sk => `<span class="skill-pill">${esc(sk)}</span>`).join('')}</div>
    </div>`;
  }

  // Projects
  if (s.projects.length > 0 && s.projects.some(p => p.name)) {
    html += `<div class="resume-section"><div class="section-title">Projects</div>`;
    s.projects.forEach(proj => {
      if (!proj.name) return;
      html += `<div class="resume-entry">
        <div class="entry-header">
          <div class="entry-title">${esc(proj.name)}</div>
          ${proj.link ? `<a href="${esc(proj.link)}" class="entry-date" target="_blank" style="color:#000;text-decoration:none;">${esc(proj.link.replace(/^https?:\/\//, ''))}</a>` : ''}
        </div>
        ${proj.description ? `<div class="entry-desc">${esc(proj.description)}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  }

  // Certifications
  if (s.certifications.length > 0 && s.certifications.some(c => c.name)) {
    html += `<div class="resume-section"><div class="section-title">Certifications</div>`;
    s.certifications.forEach(cert => {
      if (!cert.name) return;
      html += `<div class="resume-entry">
        <div class="entry-header">
          <div>
            <div class="entry-title">${esc(cert.name)}</div>
            ${cert.issuer ? `<div class="entry-subtitle">${esc(cert.issuer)}</div>` : ''}
          </div>
          <div class="entry-date">${esc(cert.date)}</div>
        </div>
      </div>`;
    });
    html += '</div>';
  }

  page.innerHTML = html;
}

// ==================== HEADER ACTION BUTTONS ====================
function bindHeaderActions() {
  document.getElementById('btn-download').addEventListener('click', () => window.print());

  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_${(state.fullName || 'data').replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Resume data exported!');
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });

  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        state = { ...defaultState, ...data };
        saveState();
        hydrateForm();
        renderPreview();
        showToast('Resume data imported!');
      } catch (err) {
        showToast('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

// ==================== MOBILE TOGGLE ====================
let mobileShowPreview = false;
function toggleMobileView() {
  mobileShowPreview = !mobileShowPreview;
  const editor = document.getElementById('editor-panel');
  const preview = document.getElementById('preview-panel');
  const btn = document.getElementById('mobile-toggle');
  if (mobileShowPreview) {
    editor.classList.add('hidden');
    preview.classList.add('active');
    btn.textContent = '✏️ Edit';
  } else {
    editor.classList.remove('hidden');
    preview.classList.remove('active');
    btn.textContent = '👁 Preview';
  }
}

// ==================== UTILITIES ====================
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDesc(text) {
  // Convert lines starting with - or • into bullet points
  const lines = text.split('\n');
  const bullets = [];
  const plain = [];
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      bullets.push(trimmed.replace(/^[-•]\s*/, ''));
    } else if (trimmed) {
      plain.push(trimmed);
    }
  });
  let html = '';
  if (plain.length) html += `<p>${plain.map(esc).join(' ')}</p>`;
  if (bullets.length) html += `<ul style="margin:4px 0 0 16px;padding:0;">${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`;
  return html;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
