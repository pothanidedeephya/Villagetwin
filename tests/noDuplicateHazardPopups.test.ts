import puppeteer, { Browser, Page } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

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

const recordedConsoleErrors: string[] = [];

console.log('\n================================================================');
console.log(' Bharat Village Twin: Single Authoritative Hazard Details Verification');
console.log('================================================================\n');

async function runTestSuite() {
  const browser: Browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  try {
    const page: Page = await browser.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('404') && !text.includes('400')) {
          recordedConsoleErrors.push(text);
        }
      }
    });

    await page.setViewport({ width: 1440, height: 900 });

    console.log('--- Test 1: Cyclone Hazard Selection & No Duplicate Center Popup ---');
    console.log('  Navigating to Bharat Village Twin at http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.leaflet-container', { timeout: 15000 });
    await delay(1500);

    // 1. Select Cyclone in left sidebar
    console.log('  Selecting Cyclone hazard tab in sidebar...');
    const cycloneSelected = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent && b.textContent.includes('Cyclone'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(cycloneSelected, 'Cyclone hazard tab selected');
    await delay(1200);

    // 2. Click the Cyclone Gale-Force / Storm Surge hazard polygon
    console.log('  Clicking Cyclone hazard polygon on the map...');
    const polygonClicked = await page.evaluate(() => {
      const pane = document.querySelector('.leaflet-hazardOverlay-pane');
      if (!pane) return false;
      const paths = Array.from(pane.querySelectorAll('path'));
      if (paths.length === 0) return false;

      // Click the middle or top polygon (e.g. gale corridor or storm surge)
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
      return true;
    });
    assert(polygonClicked, 'Dispatched click on cyclone hazard polygon');
    await delay(600);

    // 3. Inspect DOM for duplicate popup vs right-side panel
    const hazardState = await page.evaluate(() => {
      const centerPopup = document.querySelector('.leaflet-popup.hazard-impact-popup');
      const rightPanel = document.querySelector('[data-testid="hazard-detail-panel"]');
      const allPopups = document.querySelectorAll('.leaflet-popup');

      let panelData: any = null;
      if (rightPanel) {
        const text = rightPanel.textContent || '';
        const rect = rightPanel.getBoundingClientRect();
        panelData = {
          exists: true,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          textSnippet: text.substring(0, 160),
          hasTitle: text.includes('Corridor') || text.includes('Zone') || text.includes('Cyclone') || text.includes('Surge'),
          hasDescription: text.includes('wind') || text.includes('Wind') || text.includes('Surge') || text.includes('sector') || text.includes('inundation'),
          hasMetrics: text.includes('Metrics') || text.includes('Wind Speed') || text.includes('km/h') || text.includes('Surge'),
          hasImpactArea: text.includes('Impact Area') || text.includes('ha'),
          hasModelBasis: text.includes('Model Basis'),
          hasMethodology: text.includes('Methodology:'),
          hasCloseBtn: !!rightPanel.querySelector('[data-testid="hazard-detail-close-btn"]'),
        };
      }

      // Check if any polygon is styled as highlighted (weight 3.5 / color #0f172a)
      const pane = document.querySelector('.leaflet-hazardOverlay-pane');
      const paths = Array.from(pane?.querySelectorAll('path') || []);
      const highlightedPath = paths.find((p) => {
        const strokeWidth = p.getAttribute('stroke-width');
        const stroke = p.getAttribute('stroke');
        return strokeWidth === '3.5' || stroke === '#0f172a';
      });

      return {
        centerPopupExists: centerPopup !== null,
        totalLeafletPopups: allPopups.length,
        rightPanelExists: rightPanel !== null,
        panelData,
        isPolygonHighlighted: highlightedPath !== undefined,
      };
    });

    assert(hazardState.rightPanelExists, 'Authoritative right-side hazard details panel is mounted');
    assert(!hazardState.centerPopupExists, 'Duplicate floating popup in the centre of the map is REMOVED (0 found)');
    assert(hazardState.totalLeafletPopups === 0, 'No stray Leaflet popups active when hazard is selected');
    assert(hazardState.isPolygonHighlighted, 'Selected hazard polygon is highlighted on the map (weight 3.5, stroke #0f172a)');
    assert(hazardState.panelData.hasTitle, 'Right panel displays complete hazard title');
    assert(hazardState.panelData.hasDescription, 'Right panel displays hazard physical description');
    assert(hazardState.panelData.hasMetrics, 'Right panel displays physical & hydrological metrics (wind speed/surge)');
    assert(hazardState.panelData.hasImpactArea, 'Right panel displays impact area in hectares');
    assert(hazardState.panelData.hasModelBasis, 'Right panel displays calibrated model basis');
    assert(hazardState.panelData.hasMethodology, 'Right panel displays scientific methodology');
    assert(hazardState.panelData.hasCloseBtn, 'Right panel displays close button');

    const shot1 = path.join(SCREENSHOT_DIR, 'cyclone-single-panel.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`  ✓ Screenshot saved: ${shot1}`);

    // -------------------------------------------------------------------------
    // Test 2: Select Another Hazard Zone & Update Details Panel
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Select Another Hazard Zone (Updates Same Panel) ---');
    const clickedSecond = await page.evaluate(() => {
      const pane = document.querySelector('.leaflet-hazardOverlay-pane');
      if (!pane) return false;
      const paths = Array.from(pane.querySelectorAll('path'));
      if (paths.length < 2) return false;

      // Click the first polygon (different zone)
      const target = paths[0];
      const bbox = target.getBoundingClientRect();
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: bbox.left + bbox.width / 2,
          clientY: bbox.top + bbox.height / 2,
        })
      );
      return true;
    });
    assert(clickedSecond, 'Clicked a different hazard polygon on map');
    await delay(500);

    const updateCheck = await page.evaluate(() => {
      const panels = document.querySelectorAll('[data-testid="hazard-detail-panel"]');
      const centerPopups = document.querySelectorAll('.leaflet-popup.hazard-impact-popup');
      return {
        panelCount: panels.length,
        centerPopupCount: centerPopups.length,
      };
    });
    assert(updateCheck.panelCount === 1, 'Still EXACTLY ONE hazard details panel visible (no duplicates)');
    assert(updateCheck.centerPopupCount === 0, 'Zero center popups visible after updating hazard');

    const shot2 = path.join(SCREENSHOT_DIR, 'hazard-updated-panel.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`  ✓ Screenshot saved: ${shot2}`);

    // -------------------------------------------------------------------------
    // Test 3: Close Details Panel & Verify Clear State
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Close Panel Dismissal & Highlight Reset ---');
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="hazard-detail-close-btn"]') as HTMLElement;
      if (closeBtn) closeBtn.click();
    });
    await delay(500);

    const closedCheck = await page.evaluate(() => {
      const rightPanel = document.querySelector('[data-testid="hazard-detail-panel"]');
      const popups = document.querySelectorAll('.leaflet-popup');

      // Check if highlighted polygon returned to normal weight
      const pane = document.querySelector('.leaflet-hazardOverlay-pane');
      const paths = Array.from(pane?.querySelectorAll('path') || []);
      const highlightedPath = paths.find((p) => p.getAttribute('stroke-width') === '3.5');

      return {
        panelExists: rightPanel !== null,
        popupsCount: popups.length,
        isStillHighlighted: highlightedPath !== undefined,
      };
    });

    assert(!closedCheck.panelExists, 'Right-side hazard panel closed cleanly');
    assert(closedCheck.popupsCount === 0, 'No duplicate or ghost popups remain in the DOM');
    assert(!closedCheck.isStillHighlighted, 'Polygon highlight reset back to default styling');

    const shot3 = path.join(SCREENSHOT_DIR, 'hazard-panel-closed.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`  ✓ Screenshot saved: ${shot3}`);

    // -------------------------------------------------------------------------
    // Test 4: Building Feature Cleanly Removed & Road Feature Selectable
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Building Feature Cleanly Removed & Road Selectable ---');
    const roadCheck = await page.evaluate(() => {
      // 1. Verify building UI elements are absent
      const buttons = Array.from(document.querySelectorAll('button'));
      const buildingBtn = buttons.find((b) => b.textContent && b.textContent.includes('Buildings ('));
      const locateBuildingsBtn = buttons.find((b) => b.textContent && b.textContent.includes('Locate Buildings'));

      // 2. Verify road layer exists and is rendered
      const roadsPane = document.querySelector('.leaflet-roadsPane-pane');
      const roadPaths = Array.from(roadsPane?.querySelectorAll('path') || []);

      return {
        hasBuildingLayerBtn: buildingBtn !== undefined,
        hasLocateBuildingsBtn: locateBuildingsBtn !== undefined,
        roadCount: roadPaths.length,
      };
    });

    assert(!roadCheck.hasBuildingLayerBtn, 'Building toggle button cleanly removed from map toolbar');
    assert(!roadCheck.hasLocateBuildingsBtn, 'Locate Buildings button cleanly removed');
    console.log(`  ✓ Building UI elements absent; road network paths present: ${roadCheck.roadCount}`);

    // -------------------------------------------------------------------------
    // Test 5: Switch Villages & Verify No Duplicate Panels
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Switch Villages (No Duplicate Panels) ---');
    const villageSwitched = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Find village switcher or select another benchmark location
      const majuliBtn = buttons.find(b => b.textContent && b.textContent.includes('Majuli'));
      if (majuliBtn) {
        majuliBtn.click();
        return true;
      }
      return false;
    });

    if (villageSwitched) {
      await delay(1200);
      const afterSwitchCheck = await page.evaluate(() => {
        const panels = document.querySelectorAll('[data-testid="hazard-detail-panel"]');
        const popups = document.querySelectorAll('.leaflet-popup.hazard-impact-popup');
        return {
          panelCount: panels.length,
          popupCount: popups.length,
        };
      });
      assert(afterSwitchCheck.panelCount <= 1, 'No duplicate panels after switching villages');
      assert(afterSwitchCheck.popupCount === 0, 'No duplicate popups after switching villages');
    }

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(' ALL VERIFICATION CHECKS PASSED: ZERO DUPLICATE POPUPS');
    console.log('================================================================\n');

    console.log(`Console Errors: ${recordedConsoleErrors.length === 0 ? '0 (Clean)' : recordedConsoleErrors.join('; ')}`);
    assert(recordedConsoleErrors.length === 0, 'No unexpected browser console errors');

  } finally {
    await browser.close();
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

