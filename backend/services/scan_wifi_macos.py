#!/usr/bin/env python3
"""
macOS Wi-Fi scanner using CoreWLAN framework.
Returns JSON list of networks with SSID, BSSID, RSSI, channel, etc.
"""

import json
import sys
import time

try:
    import objc
    from CoreWLAN import CWInterface
    from CoreLocation import CLLocationManager, kCLAuthorizationStatusAuthorizedAlways, kCLAuthorizationStatusAuthorizedWhenInUse
    
    # Request Location Permission explicitly
    # This is often needed for Python scripts to see SSIDs on macOS
    class LocationDelegate(object):
        def locationManager_didChangeAuthorizationStatus_(self, manager, status):
            pass

    location_manager = CLLocationManager.alloc().init()
    delegate = LocationDelegate()
    location_manager.setDelegate_(delegate)
    location_manager.requestWhenInUseAuthorization()
    
    # Give it a moment to register
    # time.sleep(0.5) 

    # Get default Wi-Fi interface using CWWiFiClient (newer API)
    try:
        from CoreWLAN import CWWiFiClient
        client = CWWiFiClient.sharedWiFiClient()
        interface = client.interface()
    except ImportError:
        # Fallback to old way
        interface = CWInterface.interface()
    
    if interface is None:
        print(json.dumps({"error": "No Wi-Fi interface found"}))
        sys.exit(1)
    
    # Scan for networks
    # scanForNetworksWithSSID_error_ is the newer method
    try:
        networks_set, error = interface.scanForNetworksWithSSID_error_(None, None)
    except AttributeError:
        # Fallback for older macOS
        networks_set, error = interface.scanForNetworksWithName_error_(None, None)
    
    if error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
    
    if not networks_set:
        print(json.dumps([]))
        sys.exit(0)
    
    # Convert to list of dicts
    results = []
    for network in networks_set:
        try:
            # Extract network properties
            ssid = network.ssid()
            bssid = network.bssid()
            rssi = network.rssiValue()
            
            # Debug: Print to stderr if SSID is missing
            if not ssid:
                 # Try to get SSID from description if direct access fails (sometimes works)
                 desc = str(network.description())
                 if "SSID=" in desc:
                     # simplistic parse attempt if needed, but usually ssid() should work
                     pass
                 sys.stderr.write(f"Debug: Found network with BSSID {bssid} but SSID is None/Empty\n")

            # Extract channel info
            channel_obj = network.wlanChannel()
            channel = int(channel_obj.channelNumber()) if channel_obj else None
            
            # Calculate frequency from channel (approximate)
            frequency = None
            if channel:
                if 1 <= channel <= 14:
                    frequency = 2412 + (channel - 1) * 5
                elif 32 <= channel <= 196:
                    frequency = 5000 + channel * 5
            
            # Security type
            security = []
            if network.supportsSecurity_(1):  # WEP
                security.append("WEP")
            if network.supportsSecurity_(2):  # WPA Personal
                security.append("WPA")
            if network.supportsSecurity_(4):  # WPA2 Personal
                security.append("WPA2")
            if network.supportsSecurity_(8):  # WPA Enterprise
                security.append("WPA-Enterprise")
            if network.supportsSecurity_(16):  # WPA2 Enterprise
                security.append("WPA2-Enterprise")
            if network.supportsSecurity_(32):  # WPA3 Personal
                security.append("WPA3")
            if network.supportsSecurity_(64):  # WPA3 Enterprise
                security.append("WPA3-Enterprise")
            
            security_str = "/".join(security) if security else "Open"
            
            results.append({
                "ssid": ssid,
                "bssid": bssid,
                "rssi": rssi,
                "signal_level": rssi,  # alias for compatibility
                "channel": channel,
                "frequency": frequency,
                "security": security_str
            })
        except Exception as e:
            # Skip networks that cause errors
            continue
    
    print(json.dumps(results))
    
except ImportError:
    print(json.dumps({"error": "PyObjC not installed. Install with: pip3 install pyobjc-framework-CoreWLAN"}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
