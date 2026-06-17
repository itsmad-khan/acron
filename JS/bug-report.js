// ===== BUG REPORT BUTTON =====

function createBugReportButton() {
    // Create floating button
    const btn = document.createElement('button');
    btn.id = 'bug-report-btn';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Report Bug
    `;
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: rgba(248,113,113,0.15);
      border: 1px solid rgba(248,113,113,0.3);
      border-radius: 50px;
      color: #f87171;
      font-size: 13px;
      font-weight: 700;
      font-family: Nunito, sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      backdrop-filter: blur(8px);
    `;
  
    btn.onmouseenter = () => {
      btn.style.background = 'rgba(248,113,113,0.25)';
      btn.style.borderColor = 'rgba(248,113,113,0.5)';
      btn.style.transform = 'translateY(-2px)';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'rgba(248,113,113,0.15)';
      btn.style.borderColor = 'rgba(248,113,113,0.3)';
      btn.style.transform = 'translateY(0)';
    };
  
    btn.onclick = openBugReport;
    document.body.appendChild(btn);
  
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'bug-report-modal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
      padding: 1rem;
    `;
  
    modal.innerHTML = `
      <div style="
        background: #1a1e32;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        padding: 2rem;
        width: 100%;
        max-width: 460px;
        font-family: Nunito, sans-serif;
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <div>
            <h3 style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px">
              🐛 Report a Bug
            </h3>
            <p style="font-size:13px;color:#6b7280">
              Tell us what went wrong
            </p>
            <p style="font-size:12px;color:#6c63ff;direction:rtl;margin-top:2px">
              مسئلہ بتائیں
            </p>
          </div>
          <button onclick="closeBugReport()" style="
            background:none;border:none;
            color:#6b7280;cursor:pointer;
            font-size:20px;padding:4px;
            border-radius:8px;
          ">✕</button>
        </div>
  
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:13px;font-weight:700;color:#d1d5db;margin-bottom:6px">
            What page were you on?
          </label>
          <input type="text" id="bug-page" style="
            width:100%;
            background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;
            padding:10px 14px;
            font-size:14px;
            font-family:Nunito,sans-serif;
            color:#e8e8f0;
          " placeholder="e.g. Quiz page, Dashboard..." value="${window.location.pathname.replace('/', '').replace('.html', '') || 'Home'}"/>
        </div>
  
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:13px;font-weight:700;color:#d1d5db;margin-bottom:6px">
            What type of problem?
          </label>
          <select id="bug-type" style="
            width:100%;
            background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;
            padding:10px 14px;
            font-size:14px;
            font-family:Nunito,sans-serif;
            color:#e8e8f0;
            appearance:none;
          ">
            <option value="">— Select problem type —</option>
            <option value="quiz-not-working">Quiz not generating</option>
            <option value="login-problem">Login or signup problem</option>
            <option value="book-not-opening">Book not opening</option>
            <option value="page-not-loading">Page not loading</option>
            <option value="wrong-answer">Wrong quiz answer</option>
            <option value="design-issue">Design or display issue</option>
            <option value="other">Other problem</option>
          </select>
        </div>
  
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:13px;font-weight:700;color:#d1d5db;margin-bottom:6px">
            Describe the problem
          </label>
          <textarea id="bug-description" style="
            width:100%;
            background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;
            padding:10px 14px;
            font-size:14px;
            font-family:Nunito,sans-serif;
            color:#e8e8f0;
            resize:vertical;
            min-height:100px;
          " placeholder="Please describe what happened and what you expected to happen..."></textarea>
        </div>
  
        <div style="margin-bottom:1.5rem">
          <label style="display:block;font-size:13px;font-weight:700;color:#d1d5db;margin-bottom:6px">
            Your email (optional — so we can reply)
          </label>
          <input type="email" id="bug-email" style="
            width:100%;
            background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;
            padding:10px 14px;
            font-size:14px;
            font-family:Nunito,sans-serif;
            color:#e8e8f0;
          " placeholder="your@email.com"/>
        </div>
  
        <div id="bug-success" style="
          display:none;
          align-items:center;gap:8px;
          background:rgba(52,211,153,0.1);
          border:1px solid rgba(52,211,153,0.2);
          border-radius:10px;
          padding:10px 14px;
          color:#34d399;
          font-size:13px;font-weight:600;
          margin-bottom:1rem;
        ">
          ✅ Bug report sent! Thank you for helping us improve Acron.
        </div>
  
        <div style="display:flex;gap:10px">
          <button onclick="closeBugReport()" style="
            flex:1;padding:12px;
            background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:12px;
            color:#9ca3af;
            font-size:14px;font-weight:700;
            font-family:Nunito,sans-serif;
            cursor:pointer;
          ">Cancel</button>
          <button onclick="submitBugReport()" id="bug-submit-btn" style="
            flex:2;padding:12px;
            background:linear-gradient(135deg,#f87171,#ef4444);
            border:none;border-radius:12px;
            color:#fff;
            font-size:14px;font-weight:700;
            font-family:Nunito,sans-serif;
            cursor:pointer;
          ">
            Send Bug Report
          </button>
        </div>
      </div>
    `;
  
    document.body.appendChild(modal);
  }
  
  function openBugReport() {
    const modal = document.getElementById('bug-report-modal');
    if (modal) modal.style.display = 'flex';
  }
  
  function closeBugReport() {
    const modal = document.getElementById('bug-report-modal');
    if (modal) modal.style.display = 'none';
    // Reset form
    const success = document.getElementById('bug-success');
    if (success) success.style.display = 'none';
    const desc = document.getElementById('bug-description');
    if (desc) desc.value = '';
    const email = document.getElementById('bug-email');
    if (email) email.value = '';
    const type = document.getElementById('bug-type');
    if (type) type.value = '';
  }
  
  async function submitBugReport() {
    const page = document.getElementById('bug-page').value;
    const type = document.getElementById('bug-type').value;
    const description = document.getElementById('bug-description').value.trim();
    const email = document.getElementById('bug-email').value.trim();
  
    if (!type || !description) {
      alert('Please select problem type and describe the problem.');
      return;
    }
  
    const btn = document.getElementById('bug-submit-btn');
    btn.textContent = 'Sending...';
    btn.disabled = true;
  
    // Get user info if logged in
    const savedUser = localStorage.getItem('acron_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    const userName = user ? user.name : 'Not logged in';
    const userEmail = email || (user ? user.email : 'Not provided');
  
    try {
      const response = await fetch('https://formspree.io/f/xojzzano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: page,
          problem_type: type,
          description: description,
          user_name: userName,
          user_email: userEmail,
          url: window.location.href,
          timestamp: new Date().toLocaleString('en-PK')
        })
      });
  
      if (response.ok) {
        const success = document.getElementById('bug-success');
        success.style.display = 'flex';
        setTimeout(() => {
          closeBugReport();
        }, 3000);
      } else {
        alert('Could not send report. Please try again.');
      }
    } catch (err) {
      alert('Could not send report. Please try again.');
    }
  
    btn.textContent = 'Send Bug Report';
    btn.disabled = false;
  }
  
  // Initialize when page loads
  window.addEventListener('DOMContentLoaded', () => {
    createBugReportButton();
  });