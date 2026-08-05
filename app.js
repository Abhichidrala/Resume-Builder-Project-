/* ======================================================
   ResumeForge — app.js
   State management, live preview, templates, persistence
   ====================================================== */

// ==================== DEBOUNCE UTILITY ====================
let _renderTimer = null;
function debouncedRender(delay = 150) {
  clearTimeout(_renderTimer);
  _renderTimer = setTimeout(() => renderPreview(), delay);
}

// ==================== FONT AWESOME FALLBACK ====================
(function checkFontAwesome() {
  const link = document.querySelector('link[href*="font-awesome"]');
  if (!link) return;
  const timeout = setTimeout(() => {
    // If FA hasn't loaded in 4s, remove it so the page doesn't hang
    if (!document.fonts || document.fonts.status !== 'loaded') {
      console.warn('Font Awesome CDN slow — using emoji fallback');
    }
  }, 4000);
  if (document.fonts) {
    document.fonts.ready.then(() => clearTimeout(timeout));
  }
})();

// ==================== STATE ====================
const defaultState = {
  template: 'modern',
  skillsLayout: 'pills', // 'pills' (badges), 'list' (bullet lines), or 'paragraph'
  skillsText: '',
  sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  userFontScale: 1.0, // Global resume font size scale factor (80% - 125%)
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
    if (saved) {
      const parsed = { ...defaultState, ...JSON.parse(saved) };
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load state, resetting:', e);
    localStorage.removeItem('resumeforge_data');
  }
  return { ...defaultState };
}

function saveState() {
  localStorage.setItem('resumeforge_data', JSON.stringify(state));
}

// Ensures imported/loaded data has correct types to prevent crashes
function sanitizeState() {
  // Ensure string fields
  ['fullName','jobTitle','email','phone','location','website','github','summary','template','skillsLayout','skillsText'].forEach(key => {
    if (typeof state[key] !== 'string') state[key] = state[key] ? String(state[key]) : '';
  });

  if (!['pills', 'list', 'paragraph'].includes(state.skillsLayout)) {
    state.skillsLayout = 'pills';
  }

  // Ensure userFontScale is within valid bounds (80% to 125%)
  if (typeof state.userFontScale !== 'number' || isNaN(state.userFontScale)) {
    state.userFontScale = 1.0;
  }
  state.userFontScale = Math.min(1.25, Math.max(0.80, parseFloat(state.userFontScale.toFixed(2))));

  // Ensure section order array
  const defaultOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'];
  if (!Array.isArray(state.sectionOrder)) {
    state.sectionOrder = [...defaultOrder];
  } else {
    defaultOrder.forEach(key => {
      if (!state.sectionOrder.includes(key)) {
        state.sectionOrder.push(key);
      }
    });
    state.sectionOrder = state.sectionOrder.filter(key => defaultOrder.includes(key));
  }

  // Ensure array fields
  if (!Array.isArray(state.skills)) state.skills = [];
  state.skills = state.skills.filter(s => typeof s === 'string' && s.trim());

  if (!Array.isArray(state.experience)) state.experience = [];
  state.experience = state.experience.map(e => ({
    title: String(e?.title || ''),
    company: String(e?.company || ''),
    location: String(e?.location || ''),
    startDate: String(e?.startDate || ''),
    endDate: String(e?.endDate || ''),
    description: String(e?.description || '')
  }));

  if (!Array.isArray(state.education)) state.education = [];
  state.education = state.education.map(e => ({
    degree: String(e?.degree || ''),
    institution: String(e?.institution || ''),
    year: String(e?.year || ''),
    details: String(e?.details || '')
  }));

  if (!Array.isArray(state.projects)) state.projects = [];
  state.projects = state.projects.map(p => ({
    name: String(p?.name || ''),
    github: String(p?.github || ''),
    link: String(p?.link || ''),
    description: String(p?.description || '')
  }));

  if (!Array.isArray(state.certifications)) state.certifications = [];
  state.certifications = state.certifications.map(c => ({
    name: String(c?.name || ''),
    issuer: String(c?.issuer || ''),
    date: String(c?.date || '')
  }));
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  sanitizeState();
  saveState();
  hydrateForm();
  renderPreview();
  bindInputs();
  bindTemplateSelector();
  bindSkillInput();
  bindHeaderActions();
  bindATS();
  bindThemeToggle();
  bindAutoSuggestions();
  bindFontSizeControl();
  initDragAndDropSections();

  // Recalculate page fill spacing before printing
  window.addEventListener('beforeprint', () => autoFillPage());

  // Recalculate on window resize (for responsive preview)
  window.addEventListener('resize', () => {
    clearTimeout(window._resizeFillTimer);
    window._resizeFillTimer = setTimeout(() => autoFillPage(), 200);
  });
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

  // Reorder form sections in editor panel based on state.sectionOrder
  const editorPanel = document.getElementById('editor-panel');
  if (editorPanel && Array.isArray(state.sectionOrder)) {
    state.sectionOrder.forEach(secKey => {
      const secEl = editorPanel.querySelector(`.form-section[data-section-id="${secKey}"]`);
      if (secEl) {
        editorPanel.appendChild(secEl);
      }
    });
  }

  // Skills tags & layout UI
  updateSkillsLayoutUI();
  renderSkillTags();

  // Font size display
  const fontValEl = document.getElementById('font-size-val');
  if (fontValEl) fontValEl.textContent = `${Math.round((state.userFontScale || 1.0) * 100)}%`;
}

// ==================== BIND SIMPLE INPUTS ====================
function bindInputs() {
  document.querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      state[el.dataset.field] = el.value;
      saveState();
      debouncedRender();
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
function toggleSection(id, event) {
  if (event && event.target && event.target.closest('.drag-handle')) {
    return;
  }
  const sec = document.getElementById(id);
  if (sec) sec.classList.toggle('open');
}

// ==================== SKILLS ====================
function bindSkillInput() {
  const input = document.getElementById('skillInput');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      addSkillFromInput(input);
    }
  });

  // Layout selection buttons
  document.querySelectorAll('.skills-layout-options .layout-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const layout = btn.dataset.layout;
      state.skillsLayout = layout;

      // Sync data when switching modes
      if (layout === 'paragraph' && (!state.skillsText || !state.skillsText.trim()) && state.skills.length > 0) {
        state.skillsText = state.skills.join(', ');
        const textEl = document.getElementById('skillsText');
        if (textEl) textEl.value = state.skillsText;
      } else if (layout !== 'paragraph' && state.skills.length === 0 && state.skillsText && state.skillsText.trim()) {
        const parsed = state.skillsText.replace(/[\n;]/g, ',').split(',').map(s => s.trim()).filter(Boolean);
        state.skills = [...new Set(parsed)];
        renderSkillTags();
      }

      saveState();
      updateSkillsLayoutUI();
      renderPreview();
    });
  });
}

function updateSkillsLayoutUI() {
  const layout = state.skillsLayout || 'pills';
  document.querySelectorAll('.skills-layout-options .layout-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === layout);
  });

  const singleWrapper = document.getElementById('skills-single-wrapper');
  const paraWrapper = document.getElementById('skills-para-wrapper');

  if (layout === 'paragraph') {
    if (singleWrapper) singleWrapper.style.display = 'none';
    if (paraWrapper) paraWrapper.style.display = 'block';
  } else {
    if (singleWrapper) singleWrapper.style.display = 'block';
    if (paraWrapper) paraWrapper.style.display = 'none';
  }
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
      debouncedRender();
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
      debouncedRender();
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
    <div class="form-group">
      <label>Project Name</label>
      <input type="text" value="${esc(proj.name || '')}" data-proj="${index}" data-key="name" placeholder="e.g. E-Commerce Platform" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>GitHub Repository (optional)</label>
        <input type="url" value="${esc(proj.github || '')}" data-proj="${index}" data-key="github" placeholder="https://github.com/username/repo" />
      </div>
      <div class="form-group">
        <label>Live Demo / Website (optional)</label>
        <input type="url" value="${esc(proj.link || '')}" data-proj="${index}" data-key="link" placeholder="https://myproject.com" />
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
      debouncedRender();
    });
  });
  return div;
}

function addProject() {
  state.projects.push({ name: '', github: '', link: '', description: '' });
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
      debouncedRender();
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

  // Apply user font scale CSS property
  page.style.setProperty('--user-font-scale', state.userFontScale || 1.0);

  // Preserve dark mode class if active
  if (resumeDark) page.classList.add('resume-dark');

  const s = state;
  let html = '';

  // Header
  const contactParts = [];
  // Helper: ensure URLs have a protocol so the browser doesn't treat them as relative paths
  const ensureUrl = (url) => /^https?:\/\//i.test(url) ? url : 'https://' + url;

  if (s.email) contactParts.push(`<a href="mailto:${esc(s.email)}" style="color:#000;text-decoration:none;"><i class="fa-solid fa-envelope" style="margin-right:4px;"></i>${esc(s.email)}</a>`);
  if (s.phone) contactParts.push(`<span><i class="fa-solid fa-phone" style="margin-right:4px;"></i>${esc(s.phone)}</span>`);
  if (s.location) contactParts.push(`<span><i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>${esc(s.location)}</span>`);
  if (s.website) {
    const isLinkedIn = s.website.toLowerCase().includes('linkedin');
    const icon = isLinkedIn ? 'fa-brands fa-linkedin' : 'fa-solid fa-globe';
    contactParts.push(`<a href="${esc(ensureUrl(s.website))}" target="_blank" style="color:#000;text-decoration:none;"><i class="${icon}" style="margin-right:4px;"></i>${esc(s.website.replace(/^https?:\/\//, ''))}</a>`);
  }
  if (s.github) contactParts.push(`<a href="${esc(ensureUrl(s.github))}" target="_blank" style="color:#000;text-decoration:none;"><i class="fa-brands fa-github" style="margin-right:4px;"></i>${esc(s.github.replace(/^https?:\/\//, ''))}</a>`);

  html += `<div class="resume-header">
    <div>
      <div class="resume-name">${esc(s.fullName) || 'Your Name'}</div>
      ${s.jobTitle ? `<div class="resume-title">${esc(s.jobTitle)}</div>` : ''}
    </div>
    <div class="resume-contact">${contactParts.join(s.template === 'modern' ? '<br/>' : ' &nbsp;|&nbsp; ')}</div>
  </div>`;

  // Start content wrapper (fills remaining page space)
  html += '<div class="resume-content">';

  // Renderable content sections map
  const renderSectionMap = {
    summary: () => {
      if (!s.summary) return '';
      return `<div class="resume-section">
        <div class="section-title">Summary</div>
        <div class="resume-summary">${esc(s.summary)}</div>
      </div>`;
    },
    experience: () => {
      if (s.experience.length === 0 || !s.experience.some(e => e.title || e.company)) return '';
      let res = `<div class="resume-section"><div class="section-title">Experience</div>`;
      s.experience.forEach(exp => {
        if (!exp.title && !exp.company) return;
        res += `<div class="resume-entry">
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
      res += '</div>';
      return res;
    },
    education: () => {
      if (s.education.length === 0 || !s.education.some(e => e.degree || e.institution)) return '';
      let res = `<div class="resume-section"><div class="section-title">Education</div>`;
      s.education.forEach(edu => {
        if (!edu.degree && !edu.institution) return;
        res += `<div class="resume-entry">
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
      res += '</div>';
      return res;
    },
    skills: () => {
      const hasSingleSkills = s.skills.length > 0;
      const hasParaSkills = s.skillsText && s.skillsText.trim().length > 0;
      const layout = s.skillsLayout || 'pills';

      if (!((layout === 'paragraph' && hasParaSkills) || (layout !== 'paragraph' && hasSingleSkills) || hasSingleSkills || hasParaSkills)) {
        return '';
      }

      let res = `<div class="resume-section">
        <div class="section-title">Skills</div>`;
      
      if (layout === 'paragraph' && hasParaSkills) {
        res += `<div class="skills-paragraph">${formatSkillsParagraph(s.skillsText)}</div>`;
      } else if (layout === 'list' && hasSingleSkills) {
        res += `<ul class="skills-bullet-list">${s.skills.map(sk => `<li>${esc(sk)}</li>`).join('')}</ul>`;
      } else if (hasSingleSkills) {
        res += `<div class="skills-list">${s.skills.map(sk => `<span class="skill-pill">${esc(sk)}</span>`).join('')}</div>`;
      } else if (hasParaSkills) {
        res += `<div class="skills-paragraph">${formatSkillsParagraph(s.skillsText)}</div>`;
      }

      res += `</div>`;
      return res;
    },
    projects: () => {
      if (s.projects.length === 0 || !s.projects.some(p => p.name)) return '';
      let res = `<div class="resume-section"><div class="section-title">Projects</div>`;
      s.projects.forEach(proj => {
        if (!proj.name) return;

        const links = [];
        if (proj.github && proj.github.trim()) {
          const ghUrl = ensureUrl(proj.github.trim());
          const ghText = proj.github.trim().replace(/^https?:\/\/(www\.)?github\.com\/?/i, 'github.com/').replace(/\/$/, '');
          links.push(`<a href="${esc(ghUrl)}" target="_blank" style="color:#000;text-decoration:none;"><i class="fa-brands fa-github" style="margin-right:4px;"></i>${esc(ghText)}</a>`);
        }
        if (proj.link && proj.link.trim()) {
          const demoUrl = ensureUrl(proj.link.trim());
          const demoText = proj.link.trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
          links.push(`<a href="${esc(demoUrl)}" target="_blank" style="color:#000;text-decoration:none;"><i class="fa-solid fa-arrow-up-right-from-square" style="margin-right:3px;font-size:0.85em;"></i>${esc(demoText)}</a>`);
        }

        res += `<div class="resume-entry">
          <div class="entry-header">
            <div class="entry-title">${esc(proj.name)}</div>
            <div class="entry-date" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">${links.join('')}</div>
          </div>
          ${proj.description ? `<div class="entry-desc">${esc(proj.description)}</div>` : ''}
        </div>`;
      });
      res += '</div>';
      return res;
    },
    certifications: () => {
      if (s.certifications.length === 0 || !s.certifications.some(c => c.name)) return '';
      let res = `<div class="resume-section"><div class="section-title">Certifications</div>`;
      s.certifications.forEach(cert => {
        if (!cert.name) return;
        res += `<div class="resume-entry">
          <div class="entry-header">
            <div>
              <div class="entry-title">${esc(cert.name)}</div>
              ${cert.issuer ? `<div class="entry-subtitle">${esc(cert.issuer)}</div>` : ''}
            </div>
            <div class="entry-date">${esc(cert.date)}</div>
          </div>
        </div>`;
      });
      res += '</div>';
      return res;
    }
  };

  // Render sections according to state.sectionOrder
  const order = Array.isArray(s.sectionOrder) && s.sectionOrder.length ? s.sectionOrder : ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'];
  order.forEach(secKey => {
    if (renderSectionMap[secKey]) {
      html += renderSectionMap[secKey]();
    }
  });

  // Close content wrapper
  html += '</div>';

  page.innerHTML = html;

  // Auto-fill page: distribute remaining space between sections
  requestAnimationFrame(() => autoFillPage());
}

// ==================== INTELLIGENT AUTO-FIT LAYOUT SYSTEM ====================
function autoFitPage() {
  const page = document.getElementById('resume-page');
  if (!page) return;

  const contentWrapper = page.querySelector('.resume-content');
  if (!contentWrapper) return;

  const sections = Array.from(contentWrapper.querySelectorAll('.resume-section'));
  if (sections.length === 0) return;

  // Reset CSS variables & section margins to baseline before measuring
  page.style.removeProperty('--auto-font-scale');
  page.style.removeProperty('--auto-line-height');
  page.style.removeProperty('--auto-section-gap');
  page.style.removeProperty('--auto-entry-gap');
  page.style.removeProperty('--auto-padding-y');
  sections.forEach(sec => { sec.style.marginBottom = ''; });

  // Force reflow for accurate measurement
  void page.offsetHeight;

  // Determine target A4 page height (~297mm ≈ 1122px)
  const pageStyle = getComputedStyle(page);
  let targetHeight = parseFloat(pageStyle.minHeight) || 0;
  if (targetHeight <= 0) targetHeight = page.offsetHeight || 1122;

  let currentHeight = page.scrollHeight;

  // CASE 1: LONG CONTENT / OVERFLOW
  // If content exceeds 1 page height, incrementally tighten typography & spacing within ATS limits
  if (currentHeight > targetHeight + 2) {
    let fontScale = 1.0;
    let lineHeight = 1.35;
    let sectionGap = 8;
    let entryGap = 3;
    let paddingY = 16;

    for (let step = 0; step < 16; step++) {
      if (page.scrollHeight <= targetHeight + 1) break;

      if (sectionGap > 2) sectionGap -= 0.5;
      if (entryGap > 1) entryGap -= 0.2;
      if (paddingY > 10) paddingY -= 0.5;
      if (lineHeight > 1.20) lineHeight -= 0.012;
      if (fontScale > 0.85) fontScale -= 0.012;

      page.style.setProperty('--auto-font-scale', fontScale.toFixed(3));
      page.style.setProperty('--auto-line-height', lineHeight.toFixed(3));
      page.style.setProperty('--auto-section-gap', `${sectionGap.toFixed(1)}px`);
      page.style.setProperty('--auto-entry-gap', `${entryGap.toFixed(1)}px`);
      page.style.setProperty('--auto-padding-y', `${paddingY.toFixed(1)}px`);

      void page.offsetHeight;
    }
    return;
  }

  // CASE 2: SHORT / SPARSE CONTENT
  // If content leaves significant empty space at the bottom, scale up typography & spacing
  const remainingSpace = targetHeight - currentHeight;
  if (remainingSpace > 25) {
    const spaceRatio = Math.min(remainingSpace / targetHeight, 0.45);

    const fontScale = Math.min(1.14, 1.0 + spaceRatio * 0.28);
    const lineHeight = Math.min(1.48, 1.35 + spaceRatio * 0.28);
    const paddingY = Math.min(24, 16 + spaceRatio * 18);
    const entryGap = Math.min(7, 3 + spaceRatio * 10);
    const sectionGap = Math.min(20, 8 + spaceRatio * 24);

    page.style.setProperty('--auto-font-scale', fontScale.toFixed(3));
    page.style.setProperty('--auto-line-height', lineHeight.toFixed(3));
    page.style.setProperty('--auto-padding-y', `${paddingY.toFixed(1)}px`);
    page.style.setProperty('--auto-entry-gap', `${entryGap.toFixed(1)}px`);
    page.style.setProperty('--auto-section-gap', `${sectionGap.toFixed(1)}px`);

    void page.offsetHeight;

    // Distribute any extra remaining space evenly between sections
    const extraSpace = targetHeight - page.scrollHeight;
    if (extraSpace > 10 && sections.length > 0) {
      const extraPerSection = Math.floor(extraSpace / sections.length);
      const finalSectionGap = Math.min(36, sectionGap + extraPerSection);
      sections.forEach(sec => {
        sec.style.marginBottom = `${finalSectionGap}px`;
      });
    }
    return;
  }

  // CASE 3: BALANCED CONTENT
  page.style.setProperty('--auto-font-scale', '1.0');
  page.style.setProperty('--auto-line-height', '1.35');
  page.style.setProperty('--auto-section-gap', '8px');
  page.style.setProperty('--auto-entry-gap', '3px');
  page.style.setProperty('--auto-padding-y', '16px');
}

function autoFillPage() {
  autoFitPage();
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
        sanitizeState();
        saveState();
        hydrateForm();
        renderPreview();
        showToast('Resume data imported!');
      } catch (err) {
        console.error('Import error:', err);
        state = loadState();
        sanitizeState();
        hydrateForm();
        renderPreview();
        showToast('Error importing file. Please check the JSON format.');
      }
    };
    reader.onerror = () => {
      showToast('Error reading file');
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

// ==================== FONT SIZE STEPPER CONTROL ====================
function bindFontSizeControl() {
  const decBtn = document.getElementById('btn-font-dec');
  const incBtn = document.getElementById('btn-font-inc');
  const valEl = document.getElementById('font-size-val');

  if (decBtn) {
    decBtn.addEventListener('click', () => {
      state.userFontScale = Math.max(0.80, parseFloat(((state.userFontScale || 1.0) - 0.05).toFixed(2)));
      if (valEl) valEl.textContent = `${Math.round(state.userFontScale * 100)}%`;
      saveState();
      renderPreview();
    });
  }

  if (incBtn) {
    incBtn.addEventListener('click', () => {
      state.userFontScale = Math.min(1.25, parseFloat(((state.userFontScale || 1.0) + 0.05).toFixed(2)));
      if (valEl) valEl.textContent = `${Math.round(state.userFontScale * 100)}%`;
      saveState();
      renderPreview();
    });
  }
}

// ==================== DARK/LIGHT RESUME THEME ====================
let resumeDark = false;
function bindThemeToggle() {
  document.getElementById('btn-theme').addEventListener('click', () => {
    resumeDark = !resumeDark;
    const page = document.getElementById('resume-page');
    const themeIcon = document.getElementById('theme-icon');
    const themeLabel = document.getElementById('theme-label');
    page.classList.toggle('resume-dark', resumeDark);
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', resumeDark ? 'sun' : 'moon');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    if (themeLabel) themeLabel.textContent = resumeDark ? 'Light Resume' : 'Dark Resume';
  });
}

// ==================== ATS SCORE CHECKER ====================
function bindATS() {
  const modal = document.getElementById('ats-modal');
  document.getElementById('btn-ats').addEventListener('click', () => modal.classList.add('active'));
  document.getElementById('ats-close').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  document.getElementById('ats-analyze').addEventListener('click', () => {
    const jd = document.getElementById('ats-jd').value;
    if (!jd.trim()) { showToast('Please paste a job description'); return; }
    analyzeATS(jd);
  });
}

function analyzeATS(jobDescription) {
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','can','could','this','that','these','those','i','you','we','they','he','she','it','my','your','our','their','his','her','its','me','us','them','who','what','which','when','where','how','not','no','all','each','every','both','few','more','most','other','some','such','than','too','very','just','about','above','after','again','also','any','because','before','between','come','from','get','into','make','over','same','take','through','under','up','work','year','years','etc','including','strong','experience','ability','knowledge','understanding','working','using','must','required','preferred','plus','well','good','great','team','role','position','job','responsibilities','requirements','qualifications','skills','looking','join','apply','company','based','new','like','one','two','per']);

  // Extract keywords from JD
  const jdWords = jobDescription.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  const jdKeywords = [...new Set(jdWords)];

  // Get all resume text
  const resumeText = getResumeText().toLowerCase();

  // Check matches
  const matched = [];
  const missing = [];
  jdKeywords.forEach(kw => {
    if (resumeText.includes(kw)) matched.push(kw);
    else missing.push(kw);
  });

  const score = jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 0;
  renderATSResults(score, matched, missing);
}

function getResumeText() {
  const s = state;
  let text = [s.fullName, s.jobTitle, s.email, s.phone, s.location, s.website, s.github, s.summary].join(' ');
  text += ' ' + s.skills.join(' ') + ' ' + (s.skillsText || '');
  s.experience.forEach(e => text += ` ${e.title} ${e.company} ${e.location} ${e.description}`);
  s.education.forEach(e => text += ` ${e.degree} ${e.institution} ${e.details}`);
  s.projects.forEach(p => text += ` ${p.name} ${p.description}`);
  s.certifications.forEach(c => text += ` ${c.name} ${c.issuer}`);
  return text;
}

function renderATSResults(score, matched, missing) {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Great match! Your resume aligns well.' : score >= 40 ? 'Decent match. Consider adding missing keywords.' : 'Low match. Add more relevant keywords from the JD.';

  let html = `
    <div class="ats-score-ring">
      <svg><circle class="ring-bg" cx="60" cy="60" r="52" stroke-dasharray="${circumference}" />
      <circle class="ring-fill" cx="60" cy="60" r="52" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" style="stroke:${color}" /></svg>
      <span class="ats-score-text" style="-webkit-text-fill-color:${color};background:none;">${score}%</span>
    </div>
    <div class="ats-label">${label}</div>`;

  if (matched.length) {
    html += `<div class="ats-section-label"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><path d="M20 6 9 17l-5-5"/></svg>Matched Keywords (${matched.length})</div>
      <div class="ats-keywords">${matched.map(k => `<span class="ats-keyword matched">${k}</span>`).join('')}</div>`;
  }
  if (missing.length) {
    html += `<div class="ats-section-label"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>Missing Keywords (${missing.length})</div>
      <div class="ats-keywords">${missing.slice(0, 30).map(k => `<span class="ats-keyword missing">${k}</span>`).join('')}</div>`;
  }

  document.getElementById('ats-results').innerHTML = html;
}

// ==================== AUTO-SUGGESTIONS ====================
const skillsDatabase = {
  'software': ['JavaScript','Python','Java','C++','React','Node.js','SQL','Git','Docker','AWS','TypeScript','REST APIs','MongoDB','PostgreSQL','Redis','Kubernetes','CI/CD','Agile','Scrum','Linux'],
  'web': ['HTML','CSS','JavaScript','React','Vue.js','Angular','Node.js','TypeScript','REST APIs','GraphQL','Sass','Tailwind CSS','Next.js','Webpack','Responsive Design','SEO','Figma','UI/UX'],
  'data': ['Python','SQL','Pandas','NumPy','Machine Learning','TensorFlow','PyTorch','Tableau','Power BI','R','Spark','Hadoop','Statistics','Data Visualization','ETL','Scikit-learn','Deep Learning','NLP'],
  'ai': ['Python','TensorFlow','PyTorch','Machine Learning','Deep Learning','NLP','Computer Vision','Scikit-learn','Keras','OpenCV','Pandas','NumPy','Reinforcement Learning','GANs','Transformers','LLMs','MLOps'],
  'design': ['Figma','Adobe XD','Photoshop','Illustrator','Sketch','UI Design','UX Design','Wireframing','Prototyping','User Research','Design Systems','Typography','Color Theory','Responsive Design','Accessibility'],
  'mobile': ['React Native','Flutter','Swift','Kotlin','iOS','Android','Dart','Xcode','Firebase','REST APIs','SQLite','UI/UX','App Store','Google Play','Push Notifications'],
  'devops': ['Docker','Kubernetes','AWS','Azure','GCP','CI/CD','Jenkins','Terraform','Ansible','Linux','Bash','Monitoring','Prometheus','Grafana','Nginx','Networking'],
  'marketing': ['SEO','Google Analytics','Content Marketing','Social Media','Email Marketing','PPC','Google Ads','Facebook Ads','Copywriting','A/B Testing','HubSpot','Mailchimp','Branding','Market Research'],
  'project': ['Agile','Scrum','Kanban','Jira','Confluence','Risk Management','Stakeholder Management','Budgeting','MS Project','Leadership','Communication','Problem Solving','Critical Thinking'],
  'general': ['Communication','Teamwork','Problem Solving','Leadership','Time Management','Critical Thinking','Adaptability','Creativity','Collaboration','Presentation','Project Management','Analytical Skills']
};

function bindAutoSuggestions() {
  const input = document.getElementById('skillInput');
  const dropdown = document.getElementById('suggestions-dropdown');

  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    if (val.length < 1) { dropdown.classList.remove('active'); return; }

    const allSuggestions = getSuggestedSkills();
    const filtered = allSuggestions.filter(s =>
      s.toLowerCase().includes(val) && !state.skills.includes(s)
    ).slice(0, 8);

    if (filtered.length === 0) { dropdown.classList.remove('active'); return; }

    dropdown.innerHTML = filtered.map(s =>
      `<div class="suggestion-item" data-skill="${esc(s)}">${esc(s)}</div>`
    ).join('');
    dropdown.classList.add('active');

    dropdown.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        state.skills.push(item.dataset.skill);
        input.value = '';
        dropdown.classList.remove('active');
        saveState();
        renderSkillTags();
        renderPreview();
      });
    });
  });

  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.remove('active'), 200);
  });
}

function getSuggestedSkills() {
  const title = (state.jobTitle || '').toLowerCase();
  let pool = [...skillsDatabase.general];

  Object.entries(skillsDatabase).forEach(([key, skills]) => {
    if (key !== 'general' && title.includes(key)) pool = [...skills, ...pool];
  });

  // Also match specific keywords
  if (title.includes('frontend') || title.includes('front-end') || title.includes('front end')) pool = [...skillsDatabase.web, ...pool];
  if (title.includes('backend') || title.includes('back-end') || title.includes('back end')) pool = [...skillsDatabase.software, ...pool];
  if (title.includes('full stack') || title.includes('fullstack')) pool = [...skillsDatabase.web, ...skillsDatabase.software, ...pool];
  if (title.includes('engineer') || title.includes('developer')) pool = [...skillsDatabase.software, ...pool];
  if (title.includes('scientist') || title.includes('analyst')) pool = [...skillsDatabase.data, ...pool];
  if (title.includes('machine learning') || title.includes('ml ')) pool = [...skillsDatabase.ai, ...pool];
  if (title.includes('designer') || title.includes('ux') || title.includes('ui')) pool = [...skillsDatabase.design, ...pool];
  if (title.includes('mobile') || title.includes('ios') || title.includes('android')) pool = [...skillsDatabase.mobile, ...pool];
  if (title.includes('devops') || title.includes('cloud') || title.includes('sre')) pool = [...skillsDatabase.devops, ...pool];
  if (title.includes('manager') || title.includes('lead')) pool = [...skillsDatabase.project, ...pool];

  return [...new Set(pool)];
}

function addSkillFromInput(input) {
  const val = input.value.trim();
  if (!val) return;

  // Support adding single skills or comma-separated skills
  const items = val.split(',').map(s => s.trim()).filter(Boolean);
  items.forEach(item => {
    if (!state.skills.includes(item)) {
      state.skills.push(item);
    }
  });

  input.value = '';
  document.getElementById('suggestions-dropdown').classList.remove('active');
  saveState();
  renderSkillTags();
  renderPreview();
}

// ==================== DRAG & DROP SECTION REORDERING ====================
function initDragAndDropSections() {
  const editorPanel = document.getElementById('editor-panel');
  if (!editorPanel) return;

  const sections = Array.from(editorPanel.querySelectorAll('.form-section[data-section-id]'));

  sections.forEach(sec => {
    sec.setAttribute('draggable', 'true');

    // Desktop HTML5 Drag & Drop
    sec.addEventListener('dragstart', (e) => {
      sec.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', sec.dataset.sectionId);
      }
    });

    sec.addEventListener('dragend', () => {
      sec.classList.remove('dragging');
      editorPanel.querySelectorAll('.form-section').forEach(s => s.classList.remove('drag-over'));
      updateSectionOrderFromDOM();
    });

    sec.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const draggingSec = editorPanel.querySelector('.form-section.dragging');
      if (draggingSec && draggingSec !== sec) {
        const rect = sec.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) {
          editorPanel.insertBefore(draggingSec, sec);
        } else {
          editorPanel.insertBefore(draggingSec, sec.nextSibling);
        }
      }
    });

    sec.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (!sec.classList.contains('dragging')) {
        sec.classList.add('drag-over');
      }
    });

    sec.addEventListener('dragleave', () => {
      sec.classList.remove('drag-over');
    });

    // Mobile Touch Drag Support
    const handle = sec.querySelector('.drag-handle');
    if (handle) {
      let activeSec = null;

      handle.addEventListener('touchstart', (e) => {
        activeSec = sec;
        activeSec.classList.add('dragging');
      }, { passive: true });

      handle.addEventListener('touchmove', (e) => {
        if (!activeSec) return;
        const touch = e.touches[0];
        const currentY = touch.clientY;

        const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetEl) {
          const targetSec = targetEl.closest('.form-section[data-section-id]');
          if (targetSec && targetSec !== activeSec) {
            const rect = targetSec.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (currentY < midpoint) {
              editorPanel.insertBefore(activeSec, targetSec);
            } else {
              editorPanel.insertBefore(activeSec, targetSec.nextSibling);
            }
          }
        }
      }, { passive: true });

      handle.addEventListener('touchend', () => {
        if (activeSec) {
          activeSec.classList.remove('dragging');
          activeSec = null;
          updateSectionOrderFromDOM();
        }
      });

      handle.addEventListener('touchcancel', () => {
        if (activeSec) {
          activeSec.classList.remove('dragging');
          activeSec = null;
          updateSectionOrderFromDOM();
        }
      });
    }
  });
}

function updateSectionOrderFromDOM() {
  const editorPanel = document.getElementById('editor-panel');
  if (!editorPanel) return;

  const currentSections = Array.from(editorPanel.querySelectorAll('.form-section[data-section-id]'));
  const newOrder = currentSections.map(sec => sec.dataset.sectionId).filter(Boolean);

  if (newOrder.length > 0) {
    state.sectionOrder = newOrder;
    saveState();
    renderPreview();
  }
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
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg> Edit';
  } else {
    editor.classList.remove('hidden');
    preview.classList.remove('active');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> Preview';
  }
}

// ==================== UTILITIES ====================
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatSkillsParagraph(text) {
  if (!text) return '';
  const lines = text.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    // Auto-bold category titles if line contains colon (e.g. "Frontend:")
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0 && colonIdx < 35) {
      const category = trimmed.substring(0, colonIdx + 1);
      const rest = trimmed.substring(colonIdx + 1);
      return `<div style="margin-bottom:3px;"><strong>${esc(category)}</strong>${esc(rest)}</div>`;
    }
    return `<div style="margin-bottom:3px;">${esc(trimmed)}</div>`;
  }).filter(Boolean).join('');
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
