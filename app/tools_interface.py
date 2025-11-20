#!/usr/bin/env python3
"""
Tools Interface for RAG Bot
Connects to Docker API endpoints and provides tool definitions
"""

import requests
import json
from typing import Dict, Any, List, Optional

# API endpoint - change if running on different host/port
API_BASE_URL = "http://localhost:5000"

# Tool definitions for the LLM
TOOLS_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "full_status",
            "description": "Obtiene información completa del usuario de Active Directory incluyendo: estado de cuenta, último logueo, expiración de cuenta y contraseña. Usa esta herramienta cuando necesites información detallada sobre un usuario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "login": {
                        "type": "string",
                        "description": "El nombre de usuario (login/sAMAccountName) del usuario en Active Directory. Por ejemplo: 'jperez', 'mgonzalez', etc."
                    }
                },
                "required": ["login"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "acc_status",
            "description": "Obtiene el estado de la cuenta del usuario en Active Directory: si está habilitada o deshabilitada, y su fecha de expiración. Usa esta herramienta cuando solo necesites verificar el estado de la cuenta.",
            "parameters": {
                "type": "object",
                "properties": {
                    "login": {
                        "type": "string",
                        "description": "El nombre de usuario (login/sAMAccountName) del usuario en Active Directory."
                    }
                },
                "required": ["login"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "pass_status",
            "description": "Obtiene información sobre la expiración de la contraseña del usuario en Active Directory. Usa esta herramienta cuando necesites verificar cuándo expira la contraseña.",
            "parameters": {
                "type": "object",
                "properties": {
                    "login": {
                        "type": "string",
                        "description": "El nombre de usuario (login/sAMAccountName) del usuario en Active Directory."
                    }
                },
                "required": ["login"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "change_order",
            "description": "Extrae información detallada de una Orden de Cambio (Change Order) del sistema CA Service Desk Manager. Incluye datos del cambio y tareas del workflow. Usa esta herramienta cuando necesites consultar información sobre un cambio específico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "El ID de la orden de cambio, por ejemplo: 'CHG000123', 'CHG000456', etc."
                    }
                },
                "required": ["order_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "incident",
            "description": "Extrae información detallada de un Incidente (Incident) del sistema CA Service Desk Manager. Usa esta herramienta cuando necesites consultar información sobre un incidente específico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "incident_id": {
                        "type": "string",
                        "description": "El ID del incidente, por ejemplo: 'INC000123', 'INC000456', etc."
                    }
                },
                "required": ["incident_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "request",
            "description": "Extrae información detallada de una Solicitud (Request) del sistema CA Service Desk Manager. Usa esta herramienta cuando necesites consultar información sobre una solicitud específica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "request_id": {
                        "type": "string",
                        "description": "El ID de la solicitud, por ejemplo: 'RQ000123', 'RQ000456', etc."
                    }
                },
                "required": ["request_id"]
            }
        }
    }
]


class ToolsInterface:
    """Interface to call API tools from the bot"""
    
    def __init__(self, api_base_url: str = API_BASE_URL):
        self.api_base_url = api_base_url
        self.timeout = 150  # 2.5 minutes for Puppeteer automations
    
    def check_api_health(self) -> bool:
        """Check if API is accessible"""
        try:
            response = requests.get(f"{self.api_base_url}/api/health", timeout=5)
            return response.status_code == 200
        except Exception:
            return False
    
    def check_vpn_status(self) -> Dict[str, Any]:
        """Check VPN connection status"""
        try:
            response = requests.get(f"{self.api_base_url}/api/vpn/status", timeout=5)
            return response.json()
        except Exception as e:
            return {"error": f"Failed to check VPN status: {str(e)}"}
    
    def full_status(self, login: str) -> Dict[str, Any]:
        """Get full Active Directory user status"""
        try:
            response = requests.get(
                f"{self.api_base_url}/api/full_status",
                params={"login": login},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Error al consultar full_status: {str(e)}"}
    
    def acc_status(self, login: str) -> Dict[str, Any]:
        """Get Active Directory account status"""
        try:
            response = requests.get(
                f"{self.api_base_url}/api/acc_status",
                params={"login": login},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Error al consultar acc_status: {str(e)}"}
    
    def pass_status(self, login: str) -> Dict[str, Any]:
        """Get Active Directory password status"""
        try:
            response = requests.get(
                f"{self.api_base_url}/api/pass_status",
                params={"login": login},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Error al consultar pass_status: {str(e)}"}
    
    def change_order(self, order_id: str) -> Dict[str, Any]:
        """Extract Change Order information from Service Desk"""
        try:
            response = requests.get(
                f"{self.api_base_url}/api/change_order",
                params={"order_id": order_id},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Error al consultar change_order: {str(e)}"}
    
    def incident(self, incident_id: str) -> Dict[str, Any]:
        """Extract Incident information from Service Desk"""
        try:
            response = requests.get(
                f"{self.api_base_url}/api/incident",
                params={"incident_id": incident_id},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Error al consultar incident: {str(e)}"}
    
    def request(self, request_id: str) -> Dict[str, Any]:
        """Extract Request information from Service Desk"""
        try:
            response = requests.get(
                f"{self.api_base_url}/api/request",
                params={"request_id": request_id},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Error al consultar request: {str(e)}"}
    
    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool by name with given arguments"""
        if not hasattr(self, tool_name):
            return {"error": f"Tool '{tool_name}' not found"}
        
        try:
            tool_func = getattr(self, tool_name)
            result = tool_func(**arguments)
            return result
        except Exception as e:
            return {"error": f"Error executing {tool_name}: {str(e)}"}


def get_tools_definitions() -> List[Dict[str, Any]]:
    """Get the tools definitions for OpenAI function calling"""
    return TOOLS_DEFINITIONS


def format_tool_result(result: Dict[str, Any]) -> str:
    """Format tool result for display to user"""
    if "error" in result:
        return f"❌ **Error:** {result['error']}"
    
    if "success" in result and result["success"]:
        data = result.get("data", {})
        
        # Format based on data structure
        formatted = "✅ **Resultado:**\n\n"
        
        # Check if it's AD data or Service Desk data
        if "login" in data:
            # Active Directory data
            formatted += "**Información del Usuario:**\n"
            for key, value in data.items():
                # Translate keys to Spanish for better readability
                key_translations = {
                    "login": "Usuario",
                    "nombre_completo": "Nombre Completo",
                    "identificacion": "Identificación",
                    "estado_cuenta": "Estado de Cuenta",
                    "ultimo_logueo": "Último Logueo",
                    "expiracion_cuenta": "Expiración de Cuenta",
                    "expiracion_contrasena": "Expiración de Contraseña"
                }
                display_key = key_translations.get(key, key.replace("_", " ").title())
                formatted += f"- **{display_key}:** {value}\n"
        
        elif "changeOrderData" in data or "incidentData" in data or "requestData" in data:
            # Service Desk data
            formatted += "**Información del Ticket:**\n\n"
            formatted += f"```json\n{json.dumps(data, indent=2, ensure_ascii=False)}\n```"
        
        else:
            # Generic data
            formatted += f"```json\n{json.dumps(data, indent=2, ensure_ascii=False)}\n```"
        
        return formatted
    
    # Fallback
    return f"```json\n{json.dumps(result, indent=2, ensure_ascii=False)}\n```"


# Create global instance
tools_interface = ToolsInterface()
