#!/usr/bin/env python3
"""
Client example to call the AD Automation API from your local machine
"""

import requests
import json
import sys

# API endpoint (change port if needed)
API_BASE_URL = "http://localhost:5000"

def check_health():
    """Check if API is healthy"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/health", timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error checking health: {e}")
        return None

def get_full_status(login):
    """Query AD user information"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/full_status",
            params={"login": login},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error querying user info: {e}")
        return None

def check_vpn_status():
    """Check VPN connection status"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/vpn/status", timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error checking VPN status: {e}")
        return None

def main():
    print("=" * 60)
    print("Active Directory Automation API Client")
    print("=" * 60)
    
    # Check health
    print("\n1. Checking API health...")
    health = check_health()
    if health:
        print(f"   Status: {health.get('status')}")
        print(f"   AD Server: {health.get('ad_server')}")
    else:
        print("   ❌ API is not responding")
        return
    
    # Check VPN status
    print("\n2. Checking VPN status...")
    vpn_status = check_vpn_status()
    if vpn_status:
        if vpn_status.get('connected'):
            print("   ✓ VPN is connected")
        else:
            print("   ⚠ VPN is not connected")
            print("   Note: You may need to start VPN manually in the container")
    
    # Query user info
    if len(sys.argv) > 1:
        login = sys.argv[1]
    else:
        login = input("\n3. Enter user login to query (or press Enter to skip): ").strip()
    
    if login:
        print(f"\n4. Querying user info for '{login}'...")
        result = get_full_status(login)
        
        if result:
            if result.get('success'):
                print("\n" + "=" * 60)
                print("USER INFORMATION")
                print("=" * 60)
                data = result.get('data', {})
                for key, value in data.items():
                    print(f"{key:.<30} {value}")
                print("=" * 60)
            else:
                print(f"   ❌ Error: {result.get('error')}")
        else:
            print("   ❌ Failed to get user information")
    
    print("\n✓ Done!")

if __name__ == '__main__':
    main()
