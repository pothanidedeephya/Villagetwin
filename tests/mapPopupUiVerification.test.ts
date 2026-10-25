import puppeteer, { Browser, Page } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// Output directories
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'tests/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TestRunResult {
  viewport: string;
  popupDetected: boolean;
  popupVisible: boolean;
  popupWidth: number;
  popupHeight: number;
  title: string;
  titleVisible: boolean;
  metricsVisible: boolean;
  descriptionVisible: boolean;
  closeBtnVisible: boolean;
  textReadable: boolean;
  clipped: boolean;
  screenshotPath: string;
}

const recordedConsoleErrors: string[] = [];
const recordedNetworkFailures: string[] = [];

console.log('\n================================================================');
console.log(' Bharat Village Twin: Automated UI Detection & Popup Verification');
console.log('================================================================\n');

async function runTestSuite() {
  const browser: Browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  try {
    const page: Page = await browser.newPage();

    // Listen for console errors & network failures
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        recordedConsoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', (req) => {
      // Exclude harmless tile/abort errors
      if (!req.url().includes('tile.openstreetmap') && !req.url().includes('arcgisonline')) {
        recordedNetworkFailures.push(`${req.method()} ${req.url()} (${req.failure()?.errorText || 'failed'})`);
      }
    });

    // ---------------------------------------------------------------------------
    // Suite 1: Desktop Viewport (1440 × 900) - Storm Surge / Hazard Popup
    // ---------------------------------------------------------------------------
    console.log('--- Suite 1: Desktop Viewport (1440 × 900) - Storm Surge Hazard Popup ---');
    await page.setViewport({ width: 1440, height: 900 });

    console.log('  Navigating to Bharat Village Twin at http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });

    // Select Cyclone hazard in left sidebar to trigger coastal storm surge model
    console.log('  Triggering Cyclone hazard model in left sidebar...');
    const cycloneSelected = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent && b.textContent.includes('Cyclone'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(cycloneSelected, 'Successfully selected Cyclone hazard in sidebar');

    // Wait for dynamic hazard impact zones to compute & Leaflet overlay paths to render
    await delay(1200);

    const hazardPathsCount = await page.evaluate(() => {
      const pane = document.querySelector('.leaflet-hazardOverlay-pane');
      if (!pane) return 0;
      return pane.querySelectorAll('path').length;
    });
    assert(hazardPathsCount > 0, `Dynamic hazard impact polygons rendered (${hazardPathsCount} zones present)`);

    // Click the storm surge polygon to trigger the Leaflet popup
    console.log('  Clicking Coastal Storm Surge Inundation Corridor polygon...');
    const clickCoords = await page.evaluate(() => {
      const pane = document.querySelector('.leaflet-hazardOverlay-pane');
      if (!pane) return null;
      const paths = Array.from(pane.querySelectorAll('path'));
      // The last path in the hazard group is the coastal storm surge corridor
      const target = paths[paths.length - 1];
      const bbox = target.getBoundingClientRect();
      const clickX = bbox.left + bbox.width / 2;
      const clickY = bbox.top + bbox.height / 2;
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: clickX,
          clientY: clickY,
        })
      );
      return { x: clickX, y: clickY };
    });
    assert(clickCoords !== null, 'Dispatched click on storm surge polygon');

    // Wait for Leaflet popup to mount & animate
    await delay(600);

    // Verify popup in DOM and measure actual rendered dimensions
    const desktopPopup = await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup.hazard-impact-popup');
      if (!popup) return null;

      const rect = popup.getBoundingClientRect();
      const content = popup.querySelector('.leaflet-popup-content');
      const contentRect = content ? content.getBoundingClientRect() : null;
      const titleEl = popup.querySelector('h4');
      const closeBtn = popup.querySelector('.leaflet-popup-close-button');
      const closeBtnRect = closeBtn ? closeBtn.getBoundingClientRect() : null;

      const bodyText = content ? (content as HTMLElement).innerText : '';
      const computedPopup = window.getComputedStyle(popup);
      const computedContent = content ? window.getComputedStyle(content) : null;

      // Check whether text is broken into single/two-character lines
      // A compressed 1-2 char column has an average line length of < 4 characters
      const lines = bodyText.split('\n').filter((l) => l.trim().length > 0);
      const shortLinesCount = lines.filter((l) => l.trim().length <= 3).length;
      const hasExcessiveOneCharWrapping = lines.length > 10 && shortLinesCount / lines.length > 0.6;

      // Check clipping within viewport
      const isClipped =
        rect.left < 0 || rect.top < 0 || rect.right > window.innerWidth || rect.bottom > window.innerHeight;

      return {
        exists: true,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        contentWidth: contentRect ? Math.round(contentRect.width) : 0,
        contentHeight: contentRect ? Math.round(contentRect.height) : 0,
        title: titleEl ? titleEl.textContent?.trim() : '',
        titleVisible: titleEl ? titleEl.getBoundingClientRect().width > 0 : false,
        metricsVisible: bodyText.includes('Peak Storm Surge:') || bodyText.includes('3.8 m'),
        descriptionVisible: bodyText.includes('Marine surge ingress sector') || bodyText.includes('Saltwater inundation'),
        closeBtnVisible: !!closeBtn && (closeBtnRect ? closeBtnRect.width > 0 : false),
        whiteSpace: computedContent ? computedContent.whiteSpace : '',
        wordBreak: computedContent ? computedContent.wordBreak : '',
        hasExcessiveOneCharWrapping,
        isClipped,
        bodyTextSnippet: bodyText.substring(0, 160).replace(/\n/g, ' '),
      };
    });

    assert(desktopPopup !== null, 'Popup element exists in the DOM');
    assert(desktopPopup.exists && desktopPopup.width > 0 && desktopPopup.height > 0, 'Popup is visible with non-zero dimensions');
    assert(desktopPopup.width >= 280 && desktopPopup.width <= 420, `Desktop width is within expected 280–420px bounds (rendered: ${desktopPopup.width}px)`);
    assert(desktopPopup.title.includes('Storm Surge') || desktopPopup.title.includes('Corridor'), `Popup title is clearly rendered: "${desktopPopup.title}"`);
    assert(desktopPopup.metricsVisible, 'Hazard metrics (Peak Storm Surge) are visible and readable');
    assert(desktopPopup.descriptionVisible, 'Scientific hazard description is visible and readable');
    assert(desktopPopup.closeBtnVisible, 'Close button is visible and clickable');
    assert(!desktopPopup.hasExcessiveOneCharWrapping, 'Text does NOT collapse into 1-2 character vertical column');
    assert(!desktopPopup.isClipped, 'Popup is positioned cleanly within the viewport');

    // Capture screenshot at 1440x900
    const shot1Path = path.join(SCREENSHOT_DIR, 'popup-1440x900-storm-surge.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`  ✓ Screenshot captured: ${shot1Path}`);

    // Test close button functionality
    console.log('  Testing close button dismissal...');
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.leaflet-popup.hazard-impact-popup .leaflet-popup-close-button') as HTMLElement;
      if (closeBtn) closeBtn.click();
    });
    await delay(400);

    const isClosed = await page.evaluate(() => {
      return document.querySelector('.leaflet-popup.hazard-impact-popup') === null;
    });
    assert(isClosed, 'Popup closed cleanly when clicking close button');

    // ---------------------------------------------------------------------------
    // Suite 2: Mid-Desktop Viewport (1280 × 800)
    // ---------------------------------------------------------------------------
    console.log('\n--- Suite 2: Mid-Desktop Viewport (1280 × 800) ---');
    await page.setViewport({ width: 1280, height: 800 });
    await delay(300);

    // Re-open popup by clicking polygon
    await page.evaluate(() => {
      const pane = document.querySelector('.leaflet-hazardOverlay-pane');
      const paths = Array.from(pane?.querySelectorAll('path') || []);
      const target = paths[paths.length - 1];
      const bbox = target.getBoundingClientRect();
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: bbox.left + bbox.width / 2,
          clientY: bbox.top + bbox.height / 2,
        })
      );
    });
    await delay(500);

    const midDesktopPopup = await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup.hazard-impact-popup');
      if (!popup) return null;
      const rect = popup.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        isClipped: rect.left < 0 || rect.right > 1280 || rect.top < 0 || rect.bottom > 800,
      };
    });

    assert(midDesktopPopup !== null, 'Popup renders at 1280x800 viewport');
    assert(midDesktopPopup.width >= 280 && midDesktopPopup.width <= 420, `Width at 1280x800 is normal rectangular size (${midDesktopPopup.width}px)`);
    assert(!midDesktopPopup.isClipped, 'Popup stays within 1280x800 map viewport');

    const shot2Path = path.join(SCREENSHOT_DIR, 'popup-1280x800-storm-surge.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`  ✓ Screenshot captured: ${shot2Path}`);

    // ---------------------------------------------------------------------------
    // Suite 3: Mobile Viewport (390 × 844) - Responsive Scaling
    // ---------------------------------------------------------------------------
    console.log('\n--- Suite 3: Mobile Viewport (390 × 844) - Responsive Scaling ---');
    await page.setViewport({ width: 390, height: 844 });
    await delay(400);

    // Click polygon on mobile
    await page.evaluate(() => {
      const pane = document.querySelector('.leaflet-hazardOverlay-pane');
      const paths = Array.from(pane?.querySelectorAll('path') || []);
      const target = paths[paths.length - 1];
      const bbox = target.getBoundingClientRect();
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: bbox.left + bbox.width / 2,
          clientY: bbox.top + bbox.height / 2,
        })
      );
    });
    await delay(500);

    const mobilePopup = await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup.hazard-impact-popup');
      if (!popup) return null;
      const rect = popup.getBoundingClientRect();
      const content = popup.querySelector('.leaflet-popup-content') as HTMLElement;
      const bodyText = content ? content.innerText : '';
      const lines = bodyText.split('\n').filter((l) => l.trim().length > 0);
      const hasExcessiveOneCharWrapping = lines.filter((l) => l.trim().length <= 3).length / lines.length > 0.6;

      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        fitsMobileWidth: rect.width <= 390 - 16,
        isReadableWidth: rect.width >= 250,
        hasExcessiveOneCharWrapping,
        hasCloseBtn: !!popup.querySelector('.leaflet-popup-close-button'),
      };
    });

    assert(mobilePopup !== null, 'Popup renders at 390x844 mobile viewport');
    assert(mobilePopup.isReadableWidth, `Mobile width is readable (rendered: ${mobilePopup.width}px >= 250px)`);
    assert(mobilePopup.fitsMobileWidth, `Mobile width fits screen with margin (${mobilePopup.width}px <= 374px)`);
    assert(!mobilePopup.hasExcessiveOneCharWrapping, 'Mobile text wraps naturally across available width');
    assert(mobilePopup.hasCloseBtn, 'Mobile close button is visible and accessible');

    const shot3Path = path.join(SCREENSHOT_DIR, 'popup-390x844-mobile.png');
    await page.screenshot({ path: shot3Path, fullPage: false });
    console.log(`  ✓ Screenshot captured: ${shot3Path}`);

    // ---------------------------------------------------------------------------
    // Suite 4: Non-Regression - Other Map Overlays, Modals & Navigation
    // ---------------------------------------------------------------------------
    console.log('\n--- Suite 4: Non-Regression Checks (Controls, Modals, Layers) ---');
    await page.setViewport({ width: 1440, height: 900 });
    await delay(300);

    // Verify left sidebar exists and is interactive
    const sidebarIntact = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      return aside !== null && aside.getBoundingClientRect().width > 200;
    });
    assert(sidebarIntact, 'Left hazard sidebar is visible and properly dimensioned');

    // Verify bottom summary cards exist and are not clipped
    const bottomCardsIntact = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const ribbon = allDivs.find(d => d.textContent?.includes('Atlas / Warning') && d.textContent?.includes('Data Trust'));
      if (!ribbon) return false;
      const rect = ribbon.getBoundingClientRect();
      return rect.height > 30 && rect.width > 300;
    });
    assert(bottomCardsIntact, 'Bottom summary dashboard ribbon is visible and responsive');

    // Verify map layer controls are present and clickable
    const layerButtonsCount = await page.evaluate(() => {
      const layerBtns = Array.from(document.querySelectorAll('button')).filter((b) =>
        ['GP Boundary', 'Impact Zone', 'Flood', 'Buildings', 'Roads', 'Drains', 'Quakes', 'Sites'].some((t) =>
          b.textContent?.includes(t)
        )
      );
      return layerBtns.length;
    });
    assert(layerButtonsCount >= 6, `Map layer controls are active (${layerButtonsCount} layer toggles present)`);

    // Verify Full Hazard Profiles modal opens without collision
    console.log('  Testing Full Hazard Profiles modal opening...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const profileBtn = btns.find((b) => b.textContent && b.textContent.includes('Full Hazard Profiles'));
      if (profileBtn) profileBtn.click();
    });
    await delay(600);

    const modalOpen = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-\\[9999\\]') || document.querySelector('.fixed.inset-0');
      return modal !== null;
    });
    assert(modalOpen, 'Full Hazard Profiles modal opened successfully in high z-index portal');

    // Close modal via Escape key
    await page.keyboard.press('Escape');
    await delay(400);

    console.log('\n================================================================');
    console.log(' AUTOMATED VERIFICATION PASSED: All Map Popup Tests Succeeded');
    console.log('================================================================\n');

    console.log('Console Errors Recorded:', recordedConsoleErrors.length === 0 ? 'None (Clean)' : recordedConsoleErrors);
    console.log('Network Failures Recorded:', recordedNetworkFailures.length === 0 ? 'None (Clean)' : recordedNetworkFailures);

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Test Suite Encountered Unhandled Error:', err);
    await browser.close();
    process.exit(1);
  }
}

runTestSuite();
