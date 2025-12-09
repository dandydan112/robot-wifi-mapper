const wifi = require('node-wifi');
const { exec } = require('child_process');
const util = require('util');
const dataStore = require('./dataStore');

const execAsync = util.promisify(exec);

// Initialize wifi scanner (iface: null -> pick system default)
wifi.init({ iface: null });

// Helper: convert channel to frequency (basic support for common 2.4GHz/5GHz channels)
function channelToFrequency(channel) {
  if (!channel) return null;
  const ch = Number(channel);
  if (isNaN(ch)) return null;
  // 2.4 GHz
  if (ch >= 1 && ch <= 14) return 2412 + (ch - 1) * 5;
  // 5 GHz approximation (common channels)
  if (ch >= 32 && ch <= 196) return 5000 + ch * 5;
  // fallback
  return null;
}

// macOS: use system_profiler to scan Wi-Fi networks (no sudo required)
async function scanDarwinSystemProfiler() {
  let pythonRssiMap = {};
  
  // Try Python CoreWLAN first to get real RSSI values
  try {
    console.log('[wifiScanner] Trying Python CoreWLAN script for real RSSI values...');
    const scriptPath = require('path').join(__dirname, 'scan_wifi_macos.py');
    
    // Try to find python3 - check local venv first, then common locations, then PATH
    let pythonCmd = 'python3';
    const fs = require('fs');
    const path = require('path');
    
    // Check for local .venv in project root (assuming backend/services/../../.venv)
    const venvPython = path.join(__dirname, '..', '..', '.venv', 'bin', 'python3');
    
    if (fs.existsSync(venvPython)) {
      pythonCmd = venvPython;
    } else {
      try {
        const { stdout: whichPython } = await execAsync('which python3', { timeout: 1000 });
        pythonCmd = whichPython.trim();
      } catch (e) {
        // Fallback to common locations if 'which' fails
        const commonPaths = [
          '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
          '/usr/local/bin/python3',
          '/opt/homebrew/bin/python3',
          '/usr/bin/python3'
        ];
        for (const p of commonPaths) {
          if (fs.existsSync(p)) {
            pythonCmd = p;
            break;
          }
        }
      }
    }
    
    console.log(`[wifiScanner] Using Python: ${pythonCmd}`);
    const { stdout, stderr } = await execAsync(`"${pythonCmd}" "${scriptPath}"`, { timeout: 10000 });
    
    if (stderr) {
      console.warn('[wifiScanner] Python stderr:', stderr);
    }
    
    const data = JSON.parse(stdout);
    
    // If Python found networks with valid SSIDs, use them directly!
    // This avoids system_profiler's "redacted" issue when Python has proper permissions.
    if (Array.isArray(data) && data.length > 0) {
      const hasValidSSIDs = data.some(n => n.ssid && n.ssid !== '<redacted>');
      
      if (hasValidSSIDs) {
        console.log(`[wifiScanner] Python CoreWLAN returned ${data.length} networks with valid SSIDs. Using them directly.`);
        return data.map(n => ({
          ssid: n.ssid,
          bssid: n.bssid,
          signal_level: n.rssi,
          channel: n.channel,
          frequency: n.frequency || channelToFrequency(n.channel),
          security: n.security,
          raw: n
        }));
      }

      // Fallback: Build a map of channel+security -> RSSI for matching later with system_profiler
      data.forEach(network => {
        if (network.rssi && network.channel) {
          // Store multiple keys for matching (channel alone + channel+frequency for better matching)
          const channelKey = `ch${network.channel}`;
          if (!pythonRssiMap[channelKey] || Math.abs(pythonRssiMap[channelKey]) < Math.abs(network.rssi)) {
            pythonRssiMap[channelKey] = network.rssi;
          }
        }
      });
      console.log(`[wifiScanner] Python CoreWLAN found ${data.length} networks (but SSIDs missing/redacted), using for RSSI enrichment only`);
    }
  } catch (err) {
    console.warn('[wifiScanner] Python CoreWLAN failed:', err.message);
  }
  
  // Always use system_profiler for SSID/BSSID (Python can't get these without Location permissions)
  try {
    console.log('[wifiScanner] Scanning Wi-Fi networks on macOS using system_profiler...');
    const { stdout } = await execAsync('system_profiler SPAirPortDataType -json 2>&1', { timeout: 15000 });
    
    console.log(`[wifiScanner] system_profiler output length: ${stdout.length} chars`);
    
    const results = parseSystemProfiler(stdout, pythonRssiMap);
    console.log(`[wifiScanner] system_profiler parsed ${results.length} networks`);
    
    // Count how many have real RSSI vs default
    const realRssi = results.filter(n => n.signal_level !== -70).length;
    const defaultRssi = results.length - realRssi;
    
    if (results.length > 0) {
      console.log(`[wifiScanner] Found ${results.length} networks (${realRssi} with real RSSI, ${defaultRssi} with default -70 dBm)`);
      return results;
    }
  } catch (err) {
    console.error('[wifiScanner] system_profiler failed:', err.message);
  }

  console.error('[wifiScanner] macOS scan failed');
  return [];
}

// Parse system_profiler JSON output
function parseSystemProfiler(stdout, pythonRssiMap = {}) {
  try {
    const data = JSON.parse(stdout);
    const results = [];
    
    // Navigate the SPAirPortDataType structure (Apple's Wi-Fi data format)
    if (data.SPAirPortDataType && Array.isArray(data.SPAirPortDataType)) {
      for (const adapter of data.SPAirPortDataType) {
        const interfaces = adapter.spairport_airport_interfaces || [];
        for (const iface of interfaces) {
          const networks = iface.spairport_airport_other_local_wireless_networks || [];
          for (const net of networks) {
            const ssid = net._name || null;
            const bssid = net.spairport_network_bssid || null;
            
            // Parse channel number from "6 (2GHz, 20MHz)" format
            const channelStr = net.spairport_network_channel || '';
            const channelMatch = channelStr.match(/^(\d+)/);
            const channel = channelMatch ? Number(channelMatch[1]) : null;
            
            const security = net.spairport_security_mode || null;
            
            // Try to get real RSSI from Python CoreWLAN data first
            let rssi = net.spairport_network_rssi ? Number(net.spairport_network_rssi) : null;
            
            // If no RSSI from system_profiler, try to match with Python data by channel
            if (!rssi && channel) {
              const channelKey = `ch${channel}`;
              if (pythonRssiMap[channelKey]) {
                rssi = pythonRssiMap[channelKey];
                // Don't delete - multiple networks can be on same channel
              }
            }
            
            // Fallback to default if still no RSSI
            if (!rssi) {
              rssi = -70; // Default medium signal
            }
            
            if (ssid) {
              results.push({
                ssid,
                bssid,
                signal_level: rssi,
                channel,
                frequency: channelToFrequency(channel),
                security,
                raw: { net }
              });
            }
          }
        }
      }
    }
    
    return results;
  } catch (err) {
    console.warn('[wifiScanner] Failed to parse system_profiler JSON:', err.message);
    return [];
  }
}

// Linux: try nmcli (if available)
async function scanLinuxNmcli() {
  try {
    const { stdout } = await execAsync(`nmcli -t -f SSID,BSSID,SIGNAL,CHAN,SECURITY dev wifi`);
    const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(l => {
      const parts = l.split(':');
      const ssid = parts[0] || null;
      const bssid = parts[1] || null;
      const signal = parts[2] ? Number(parts[2]) : null; // percent
      const channel = parts[3] ? Number(parts[3]) : null;
      return {
        ssid,
        bssid,
        signal_level: signal !== null ? Math.round((signal / 100) * -100) : null, // approximate to RSSI-like negative value
        channel,
        frequency: channelToFrequency(channel),
        security: parts[4] || null,
        raw: { line: l }
      };
    });
  } catch (err) {
    return [];
  }
}

async function performWifiScan(measurementPointId) {
  const mp = await dataStore.getMeasurementPoint(measurementPointId);
  if (!mp) return;

  // Update status -> in_progress
  await dataStore.updateMeasurementPointStatus(measurementPointId, 'in_progress');

  try {
    console.log(`[wifiScanner] Starting scan for measurementPointId=${measurementPointId} on platform=${process.platform}`);

    let networks = [];

    // Primary: try node-wifi (works on Windows/Linux in most setups, requires sudo on macOS)
    try {
      console.log('[wifiScanner] Trying node-wifi scan...');
      networks = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('node-wifi scan timeout after 10s')), 10000);
        wifi.scan((err, nets) => {
          clearTimeout(timeout);
          if (err) return reject(err);
          resolve(nets || []);
        });
      });
      
      if (Array.isArray(networks) && networks.length > 0) {
        console.log(`[wifiScanner] node-wifi found ${networks.length} networks`);
      } else {
        console.log(`[wifiScanner] node-wifi returned no results`);
      }
    } catch (e) {
      console.warn('[wifiScanner] node-wifi scan failed:', e.message || e);
      networks = [];
    }

    // If node-wifi returned nothing on macOS (darwin), fallback to system_profiler
    if ((!Array.isArray(networks) || networks.length === 0) && process.platform === 'darwin') {
      console.log('[wifiScanner] node-wifi returned no results on macOS, trying system_profiler...');
      networks = await scanDarwinSystemProfiler();
    }

    // If still empty and on linux try nmcli
    if ((!Array.isArray(networks) || networks.length === 0) && process.platform === 'linux') {
      console.log('[wifiScanner] Falling back to nmcli on Linux');
      networks = await scanLinuxNmcli();
    }

    // Filter out networks without a valid RSSI/signal value to keep behaviour consistent
    // (some macOS outputs report "null dBm" or omit RSSI)
    networks = (networks || []).filter(n => {
      const sig = (n.signal_level !== undefined && n.signal_level !== null) ? n.signal_level : (n.signal !== undefined && n.signal !== null ? n.signal : null);
      return sig !== null;
    });

    // Handle redacted SSIDs by assigning a unique placeholder name if BSSID is available
    networks = networks.map((n, idx) => {
      if (!n.ssid || n.ssid === '<redacted>') {
        // If we have a BSSID, use it to make a "unique" name so it doesn't get deduplicated away
        if (n.bssid) {
           // Keep ssid as null or redacted, but ensure we don't lose the point.
           // The frontend now handles <redacted> gracefully.
        }
      }
      return n;
    });

    console.log(`[wifiScanner] Scan completed for ${measurementPointId}: found ${Array.isArray(networks) ? networks.length : 0} networks`);
    
    if (!Array.isArray(networks) || networks.length === 0) {
      console.error(`[wifiScanner] ERROR: No networks detected for ${measurementPointId}`);
      console.error(`[wifiScanner] Platform: ${process.platform}`);
      console.error(`[wifiScanner] Possible causes:`);
      console.error(`[wifiScanner]   - Wi-Fi is turned off or disconnected`);
      console.error(`[wifiScanner]   - No Wi-Fi hardware detected`);
      console.error(`[wifiScanner]   - system_profiler failed to retrieve network data`);
      if (process.platform === 'darwin') {
        console.error(`[wifiScanner] Note: macOS uses system_profiler which may take 10-15 seconds`);
      }
    }

    // Map networks to the required fields (normalize across sources)
    const readings = (networks || []).map(n => ({
      ssid: n.ssid || null,
      bssid: n.bssid || n.mac || null,
      rssi: (n.signal_level !== undefined && n.signal_level !== null) ? n.signal_level : (n.signal !== undefined ? n.signal : null),
      frequency: n.frequency || channelToFrequency(n.channel) || null,
      channel: n.channel || null,
      security: n.security || n.security || null,
      raw: n
    }));

    // Save all readings directly to the measurement point (new schema approach)
    // Instead of creating child measurement points, we store readings in ACCESS_POINT_READING table
    await dataStore.updateMeasurementPointStatus(measurementPointId, 'done', { readings });
    
    console.log(`[wifiScanner] Saved ${readings.length} readings to measurement point ${measurementPointId}`);
    
  } catch (err) {
    console.error(`[wifiScanner] Fatal error during scan for ${measurementPointId}:`, err);
    const error = { message: err.message, code: err.code || 'SCAN_ERROR' };
    await dataStore.updateMeasurementPointStatus(measurementPointId, 'failed', { error });
  }
}

module.exports = {
  performWifiScan
};
