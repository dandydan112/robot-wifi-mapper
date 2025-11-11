#!/usr/bin/env python3
"""
macOS Wi-Fi scanner using CoreWLAN framework.
Returns JSON list of networks with SSID, BSSID, RSSI, channel, etc.
"""

import json
import sys

try:
    from CoreWLAN import CWInterface
    
    # Get default Wi-Fi interface
    interface = CWInterface.interface()
    
    if interface is None:
        print(json.dumps({"error": "No Wi-Fi interface found"}))
        sys.exit(1)
    
    # Scan for networks
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
