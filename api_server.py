#!/usr/bin/env python3
"""
Flask API Server for Active Directory Automation
Exposes endpoints to query AD user information via VPN
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import sys
import os
import json

# Add automation directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'automation'))

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Import and modify full_status functionality
from ldap3 import Server, Connection, ALL, NTLM
from datetime import datetime, timedelta
import pytz
import ssl

# Enable legacy algorithms (MD4) for NTLM authentication
try:
    import hashlib
    hashlib.new('md4')
except ValueError:
    os.environ['OPENSSL_CONF'] = '/etc/ssl/openssl.cnf'
    try:
        ssl_context = ssl.create_default_context()
        ssl_context.set_ciphers('DEFAULT:@SECLEVEL=1')
    except Exception:
        pass

# Configuration
AD_SERVER = 'net-dc02'
BASE_DN = 'dc=epmtelco,dc=com,dc=co'
USER_DOMAIN = 'EPMTELCO\\rinforma'  # Change as needed
PASSWORD = 'ChatBot2025/*-+'  # Change as needed

def extract_last_json(output):
    """
    Extract the last valid JSON object from script output.
    The Puppeteer scripts output console.log messages followed by the final JSON.
    """
    lines = output.strip().split('\n')
    
    # Try to find JSON from the end of the output
    for i in range(len(lines) - 1, -1, -1):
        line = lines[i].strip()
        if line.startswith('{') or line.startswith('['):
            try:
                # Try to parse this line as JSON
                data = json.loads(line)
                return data
            except json.JSONDecodeError:
                # Not valid JSON, continue searching
                continue
    
    # If no single-line JSON found, try to find multi-line JSON
    # Look for the last '{' or '[' and try to parse from there
    json_start = -1
    for i in range(len(lines) - 1, -1, -1):
        if '{' in lines[i] or '[' in lines[i]:
            json_start = i
            break
    
    if json_start >= 0:
        json_text = '\n'.join(lines[json_start:])
        try:
            data = json.loads(json_text)
            return data
        except json.JSONDecodeError:
            pass
    
    return None

def convertir_filedate_a_fecha(filetime):
    """Convert Windows FILETIME to readable date"""
    if not filetime:
        return "No disponible"
    try:
        val = int(filetime.value) if hasattr(filetime, 'value') else int(filetime)
        if val in (0, 9223372036854775807):
            return "Nunca expira"
        if val < 0:
            return "No disponible"
        epoch_start = datetime(1601, 1, 1, tzinfo=pytz.utc)
        fecha_utc = epoch_start + timedelta(microseconds=val / 10)
        fecha_local = fecha_utc.astimezone()
        return fecha_local.strftime('%Y/%m/%d %H:%M:%S')
    except Exception:
        return "Fecha inválida"

def estado_cuenta(uac):
    """Check if account is enabled or disabled"""
    try:
        val = int(uac)
        return "Deshabilitada" if (val & 2) else "Habilitada"
    except Exception:
        return "Desconocido"

def get_user_info(login):
    """Query Active Directory for user information"""
    server = Server(
        AD_SERVER,
        port=389,
        get_info=None,
        connect_timeout=10,
        use_ssl=False
    )
    
    try:
        # Try NTLM authentication
        conn = Connection(
            server, 
            user=USER_DOMAIN, 
            password=PASSWORD, 
            authentication=NTLM, 
            auto_bind=False,
            read_only=True,
            check_names=False,
            lazy=False,
            raise_exceptions=True
        )
        
            
        if not conn.bind():
            return {"error": "Failed to authenticate with Active Directory"}
        
        # Search for user
        filtro = f"(sAMAccountName={login})"
        atributos = [
            'sAMAccountName',
            'displayName',
            'employeeID',
            'userAccountControl',
            'lastLogonTimestamp',
            'accountExpires',
            'msDS-UserPasswordExpiryTimeComputed'
        ]
        
        conn.search(search_base=BASE_DN, search_filter=filtro, attributes=atributos)
        
        if not conn.entries:
            return {"error": f"No user found with login '{login}'"}
        
        usuario = conn.entries[0]
        
        datos = {
            "login": usuario.sAMAccountName.value or "No definido",
            "nombre_completo": usuario.displayName.value or "No definido",
            "identificacion": usuario.employeeID.value or "No definido",
            "estado_cuenta": estado_cuenta(usuario.userAccountControl.value),
            "ultimo_logueo": convertir_filedate_a_fecha(
                usuario.lastLogonTimestamp.value if 'lastLogonTimestamp' in usuario else None
            ),
            "expiracion_cuenta": convertir_filedate_a_fecha(usuario.accountExpires),
            "expiracion_contrasena": convertir_filedate_a_fecha(
                usuario['msDS-UserPasswordExpiryTimeComputed'] if 'msDS-UserPasswordExpiryTimeComputed' in usuario else None
            )
        }
        
        return datos
        
    except Exception as e:
        return {"error": f"Error connecting to Active Directory: {str(e)}"}

def get_account_status(login):
    """Query Active Directory for account status (enabled/disabled, expiration)"""
    server = Server(
        AD_SERVER,
        port=389,
        get_info=None,
        connect_timeout=10,
        use_ssl=False
    )
    
    try:
        conn = Connection(
            server, 
            user=USER_DOMAIN, 
            password=PASSWORD, 
            authentication=NTLM, 
            auto_bind=False,
            read_only=True,
            check_names=False,
            lazy=False,
            raise_exceptions=True
        )
        
        if not conn.bind():
            return {"error": "Failed to authenticate with Active Directory"}
        
        # Search for user - account specific attributes
        filtro = f"(sAMAccountName={login})"
        atributos = [
            'sAMAccountName',
            'displayName',
            'employeeID',
            'userAccountControl',
            'accountExpires'
        ]
        
        conn.search(search_base=BASE_DN, search_filter=filtro, attributes=atributos)
        
        if not conn.entries:
            return {"error": f"No user found with login '{login}'"}
        
        usuario = conn.entries[0]
        
        datos = {
            "login": usuario.sAMAccountName.value or "No definido",
            "nombre_completo": usuario.displayName.value or "No definido",
            "identificacion": usuario.employeeID.value or "No definido",
            "estado_cuenta": estado_cuenta(usuario.userAccountControl.value),
            "expiracion_cuenta": convertir_filedate_a_fecha(usuario.accountExpires)
        }
        
        return datos
        
    except Exception as e:
        return {"error": f"Error connecting to Active Directory: {str(e)}"}

def get_password_status(login):
    """Query Active Directory for password expiration status"""
    server = Server(
        AD_SERVER,
        port=389,
        get_info=None,
        connect_timeout=10,
        use_ssl=False
    )
    
    try:
        conn = Connection(
            server, 
            user=USER_DOMAIN, 
            password=PASSWORD, 
            authentication=NTLM, 
            auto_bind=False,
            read_only=True,
            check_names=False,
            lazy=False,
            raise_exceptions=True
        )
        
        if not conn.bind():
            return {"error": "Failed to authenticate with Active Directory"}
        
        # Search for user - password specific attributes
        filtro = f"(sAMAccountName={login})"
        atributos = [
            'sAMAccountName',
            'displayName',
            'employeeID',
            'msDS-UserPasswordExpiryTimeComputed'
        ]
        
        conn.search(search_base=BASE_DN, search_filter=filtro, attributes=atributos)
        
        if not conn.entries:
            return {"error": f"No user found with login '{login}'"}
        
        usuario = conn.entries[0]
        
        datos = {
            "login": usuario.sAMAccountName.value or "No definido",
            "nombre_completo": usuario.displayName.value or "No definido",
            "identificacion": usuario.employeeID.value or "No definido",
            "expiracion_contrasena": convertir_filedate_a_fecha(
                usuario['msDS-UserPasswordExpiryTimeComputed'] if 'msDS-UserPasswordExpiryTimeComputed' in usuario else None
            )
        }
        
        return datos
        
    except Exception as e:
        return {"error": f"Error connecting to Active Directory: {str(e)}"}

@app.route('/', methods=['GET'])
def index():
    """API information endpoint"""
    return jsonify({
        "service": "Active Directory Automation API",
        "version": "1.0",
        "endpoints": {
            "/api/health": "GET - Health check",
            "/api/vpn/status": "GET - Check VPN connection status",
            "/api/full_status": "GET - Query complete AD user info (requires 'login' parameter)",
            "/api/acc_status": "GET - Query AD account status - enabled/disabled, expiration (requires 'login' parameter)",
            "/api/pass_status": "GET - Query AD password expiration status (requires 'login' parameter)",
            "/api/change_order": "GET - Extract Change Order information (requires 'order_id' parameter)",
            "/api/incident": "GET - Extract Incident information (requires 'incident_id' parameter)",
            "/api/request": "GET - Extract Request information (requires 'request_id' parameter)"
        },
        "examples": {
            "full_status": "/api/full_status?login=jdoe",
            "acc_status": "/api/acc_status?login=jdoe",
            "pass_status": "/api/pass_status?login=jdoe",
            "change_order": "/api/change_order?order_id=CHG000123",
            "incident": "/api/incident?incident_id=INC000123",
            "request": "/api/request?request_id=RQ000123"
        }
    })

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "ad_server": AD_SERVER,
        "base_dn": BASE_DN
    })

@app.route('/api/full_status', methods=['GET'])
def full_status():
    """Query Active Directory for user information"""
    login = request.args.get('login')
    
    if not login:
        return jsonify({
            "error": "Missing 'login' parameter",
            "usage": "/api/full_status?login=username"
        }), 400
    
    result = get_user_info(login)
    
    if "error" in result:
        return jsonify(result), 500
    
    return jsonify({
        "success": True,
        "data": result
    })

@app.route('/api/acc_status', methods=['GET'])
def acc_status():
    """Query Active Directory for account status (account expiration, enabled/disabled)"""
    login = request.args.get('login')
    
    if not login:
        return jsonify({
            "error": "Missing 'login' parameter",
            "usage": "/api/acc_status?login=username"
        }), 400
    
    result = get_account_status(login)
    
    if "error" in result:
        return jsonify(result), 500
    
    return jsonify({
        "success": True,
        "data": result
    })

@app.route('/api/pass_status', methods=['GET'])
def pass_status():
    """Query Active Directory for password expiration status"""
    login = request.args.get('login')
    
    if not login:
        return jsonify({
            "error": "Missing 'login' parameter",
            "usage": "/api/pass_status?login=username"
        }), 400
    
    result = get_password_status(login)
    
    if "error" in result:
        return jsonify(result), 500
    
    return jsonify({
        "success": True,
        "data": result
    })

@app.route('/api/vpn/status', methods=['GET'])
def vpn_status():
    """Check VPN connection status by looking for tun interface"""
    try:
        # Check if tun interface exists (indicates VPN is connected)
        result = subprocess.run(
            ['ip', 'addr', 'show'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        # Look for tun interface in output
        is_connected = 'tun' in result.stdout.lower()
        
        # Get openconnect processes
        ps_result = subprocess.run(
            ['ps', 'aux'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        vpn_process = any('openconnect' in line for line in ps_result.stdout.split('\n'))
        
        return jsonify({
            "connected": is_connected,
            "vpn_process_running": vpn_process,
            "interfaces": result.stdout if is_connected else "No VPN interface found",
            "message": "VPN is connected" if is_connected else "VPN is not connected. Start manually from container."
        })
    except Exception as e:
        return jsonify({
            "error": f"Failed to check VPN status: {str(e)}"
        }), 500

@app.route('/api/change_order', methods=['GET'])
def change_order():
    """Extract Change Order information from CA Service Desk Manager"""
    order_id = request.args.get('order_id')
    
    if not order_id:
        return jsonify({
            "error": "Missing 'order_id' parameter",
            "usage": "/api/change_order?order_id=CHG000123"
        }), 400
    
    try:
        # Run the Puppeteer automation script
        result = subprocess.run(
            ['node', 'final_automation.js', order_id],
            cwd='/app/automation/pptr',
            capture_output=True,
            text=True,
            timeout=120  # 2 minutes timeout
        )
        
        if result.returncode != 0:
            return jsonify({
                "error": "Automation failed",
                "details": result.stderr
            }), 500
        
        # Parse JSON output from the script
        try:
            data = extract_last_json(result.stdout)
            return jsonify({
                "success": True,
                "data": data
            })
        except json.JSONDecodeError:
            return jsonify({
                "success": True,
                "output": result.stdout
            })
            
    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Automation timeout - took longer than 2 minutes"
        }), 504
    except Exception as e:
        return jsonify({
            "error": f"Failed to run automation: {str(e)}"
        }), 500

@app.route('/api/incident', methods=['GET'])
def incident():
    """Extract Incident information from CA Service Desk Manager"""
    incident_id = request.args.get('incident_id')
    
    if not incident_id:
        return jsonify({
            "error": "Missing 'incident_id' parameter",
            "usage": "/api/incident?incident_id=INC000123"
        }), 400
    
    try:
        # Run the Puppeteer automation script
        result = subprocess.run(
            ['node', 'inc_extraction.js', incident_id],
            cwd='/app/automation/pptr',
            capture_output=True,
            text=True,
            timeout=120  # 2 minutes timeout
        )
        
        if result.returncode != 0:
            return jsonify({
                "error": "Automation failed",
                "details": result.stderr
            }), 500
        
        # Parse JSON output from the script
        try:
            data = extract_last_json(result.stdout)
            return jsonify({
                "success": True,
                "data": data
            })
        except json.JSONDecodeError:
            return jsonify({
                "success": True,
                "output": result.stdout
            })
            
    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Automation timeout - took longer than 2 minutes"
        }), 504
    except Exception as e:
        return jsonify({
            "error": f"Failed to run automation: {str(e)}"
        }), 500

@app.route('/api/request', methods=['GET'])
def request_ticket():
    """Extract Request information from CA Service Desk Manager"""
    request_id = request.args.get('request_id')
    
    if not request_id:
        return jsonify({
            "error": "Missing 'request_id' parameter",
            "usage": "/api/request?request_id=RQ000123"
        }), 400
    
    try:
        # Run the Puppeteer automation script
        result = subprocess.run(
            ['node', 'rq_extraction.js', request_id],
            cwd='/app/automation/pptr',
            capture_output=True,
            text=True,
            timeout=120  # 2 minutes timeout
        )
        
        if result.returncode != 0:
            return jsonify({
                "error": "Automation failed",
                "details": result.stderr
            }), 500
        
        # Parse JSON output from the script
        try:
            data = extract_last_json(result.stdout)
            return jsonify({
                "success": True,
                "data": data
            })
        except json.JSONDecodeError:
            return jsonify({
                "success": True,
                "output": result.stdout
            })
            
    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Automation timeout - took longer than 2 minutes"
        }), 504
    except Exception as e:
        return jsonify({
            "error": f"Failed to run automation: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Active Directory Automation API Server")
    print("=" * 60)
    print(f"AD Server: {AD_SERVER}")
    print(f"Base DN: {BASE_DN}")
    print(f"User Domain: {USER_DOMAIN}")
    print("=" * 60)
    print("Starting Flask server on 0.0.0.0:5000")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
