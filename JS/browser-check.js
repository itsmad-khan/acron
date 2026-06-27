/* ============================================================
   browser-check.js — Detects known weak/non-standard OEM
   browsers (Vivo, Oppo, Xiaomi/MIUI, Huawei, UC Browser, etc.)
   and shows a friendly banner suggesting Chrome for the best
   experience. These browsers often ship incomplete or buggy
   implementations of FileReader, ES modules, and other APIs
   the app relies on (PDF/EPUB upload, signup, etc.).
   ============================================================ */

   (function () {
    const PROBLEM_BROWSER_PATTERNS = [
      /VivoBrowser/i,
      /HeyTapBrowser/i,   // Oppo
      /MiuiBrowser/i,     // Xiaomi
      /HuaweiBrowser/i,
      /UCBrowser/i,
      /SamsungBrowser\/[1-9]\./i, // very old Samsung Internet versions only
      /MicroMessenger/i,  // WeChat in-app browser
      /Instagram/i,       // Instagram in-app browser
      /FBAN|FBAV/i,       // Facebook in-app browser
    ];
  
    function isProblemBrowser() {
      const ua = navigator.userAgent || '';
      return PROBLEM_BROWSER_PATTERNS.some(pattern => pattern.test(ua));
    }
  
    function showBrowserWarning() {
      if (sessionStorage.getItem('acron_browser_warning_dismissed') === 'true') return;
  
      const banner = document.createElement('div');
      banner.id = 'browser-warning-banner';
      banner.setAttribute('role', 'alert');
      banner.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 9999;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #1a1d2e;
        padding: 10px 16px;
        font-family: 'Nunito', sans-serif;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;
      banner.innerHTML = `
        <span>⚠️ For the best experience (especially file uploads), please open Acron in <strong>Chrome</strong>.</span>
        <button id="browser-warning-dismiss" style="
          background: rgba(0,0,0,0.1);
          border: none;
          border-radius: 6px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          color: #1a1d2e;
          flex-shrink: 0;
        ">Got it</button>
      `;
  
      document.body.prepend(banner);
  
      document.getElementById('browser-warning-dismiss')?.addEventListener('click', () => {
        banner.remove();
        sessionStorage.setItem('acron_browser_warning_dismissed', 'true');
      });
    }
  
    if (isProblemBrowser()) {
      window.addEventListener('DOMContentLoaded', showBrowserWarning);
    }
  })();