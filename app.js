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
  bindATS();
  bindThemeToggle();
  bindAutoSuggestions();
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
      addSkillFromInput(input);
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
  if (s.email) contactParts.push(`<a href="mailto:${esc(s.email)}" style="color:#000;text-decoration:none;"><i class="fa-solid fa-envelope" style="margin-right:4px;"></i>${esc(s.email)}</a>`);
  if (s.phone) contactParts.push(`<span><i class="fa-solid fa-phone" style="margin-right:4px;"></i>${esc(s.phone)}</span>`);
  if (s.location) contactParts.push(`<span><i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>${esc(s.location)}</span>`);
  if (s.website) contactParts.push(`<a href="${esc(s.website)}" target="_blank" style="color:#000;text-decoration:none;"><i class="fa-brands fa-linkedin" style="margin-right:4px;"></i>${esc(s.website.replace(/^https?:\/\//, ''))}</a>`);
  if (s.github) contactParts.push(`<a href="${esc(s.github)}" target="_blank" style="color:#000;text-decoration:none;"><i class="fa-brands fa-github" style="margin-right:4px;"></i>${esc(s.github.replace(/^https?:\/\//, ''))}</a>`);

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

// ==================== DARK/LIGHT RESUME THEME ====================
let resumeDark = false;
function bindThemeToggle() {
  document.getElementById('btn-theme').addEventListener('click', () => {
    resumeDark = !resumeDark;
    const page = document.getElementById('resume-page');
    const btn = document.getElementById('btn-theme');
    page.classList.toggle('resume-dark', resumeDark);
    btn.textContent = resumeDark ? '☀️ Light Resume' : '🌙 Dark Resume';
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
  text += ' ' + s.skills.join(' ');
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
    html += `<div class="ats-section-label">✅ Matched Keywords (${matched.length})</div>
      <div class="ats-keywords">${matched.map(k => `<span class="ats-keyword matched">${k}</span>`).join('')}</div>`;
  }
  if (missing.length) {
    html += `<div class="ats-section-label">❌ Missing Keywords (${missing.length})</div>
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
  state.skills.push(val);
  input.value = '';
  document.getElementById('suggestions-dropdown').classList.remove('active');
  saveState();
  renderSkillTags();
  renderPreview();
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
