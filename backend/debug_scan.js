const wifi = require('node-wifi');

wifi.init({ iface: null });

console.log('Running a one-off wifi scan using node-wifi...');

wifi.scan((err, networks) => {
  if (err) {
    console.error('Scan error:', err);
    process.exit(1);
  }
  console.log('Found networks:', Array.isArray(networks) ? networks.length : 0);
  if (Array.isArray(networks)) {
    networks.forEach((n, i) => {
      console.log(`#${i+1}: ssid=${n.ssid} bssid=${n.bssid || n.mac} signal_level=${n.signal_level}`);
    });
  }
  process.exit(0);
});
