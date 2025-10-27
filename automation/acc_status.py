from ldap3 import Server, Connection, ALL, NTLM
from datetime import datetime, timedelta
import tkinter as tk
import pytz  # Para manejo de zonas horarias, instala con: pip install pytz
 
# Configura tu servidor y dominio
AD_SERVER = 'net-dc02'  # Cambia por tu servidor real
BASE_DN = 'dc=epmtelco,dc=com,dc=co'
 
# Usuario y contraseña explícitos para autenticación NTLM
USER_DOMAIN = 'EPMTELCO\\rinforma'     # Cambia por tu usuario en formato DOMINIO\usuario
PASSWORD = 'ChatBot2025/*-+'           # Cambia por la contraseña del usuario
 
# Solicita el login a consultar
login = input("Ingrese el login del usuario a consultar (sAMAccountName): ").strip()
 
if not login:
    print("No se ingresó un login válido.")
    exit()
 
def convertir_filedate_a_fecha(filetime):
    if not filetime:
        return "No disponible"
    try:
        val = int(filetime.value) if hasattr(filetime, 'value') else int(filetime)
        if val in (0, 9223372036854775807):
            return "Nunca expira"
        if val < 0:
            return "No disponible"
        # Tiempo en formato FILETIME (100-ns desde 1601-01-01 UTC)
        epoch_start = datetime(1601, 1, 1, tzinfo=pytz.utc)
        fecha_utc = epoch_start + timedelta(microseconds=val / 10)
        # Convertir a hora local del sistema
        fecha_local = fecha_utc.astimezone()
        return fecha_local.strftime('%Y/%m/%d %H:%M:%S')
    except Exception:
        return "Fecha inválida"

def estado_cuenta(uac):
    try:
        val = int(uac)
        return "Deshabilitada" if (val & 2) else "Habilitada"
    except Exception:
        return "Desconocido"
 
def mostrar_ventana(datos, usuario):
    root = tk.Tk()
    root.title(f"Información de usuario: {usuario}")
    root.geometry("500x300")
    root.resizable(False, False)
 
    texto = tk.Text(root, wrap='word', font=("Consolas", 12))
    texto.pack(expand=True, fill='both')
 
    for clave, valor in datos.items():
        texto.insert(tk.END, f"{clave:<25}: {valor}\n")
 
    texto.config(state='disabled')
 
    btn_cerrar = tk.Button(root, text="Cerrar", command=root.destroy)
    btn_cerrar.pack(pady=10)
 
    root.mainloop()

 
server = Server(
    AD_SERVER,
    port=389,
    get_info=None,  # Don't gather server info (much faster)
    connect_timeout=3,
    use_ssl=False
)

try:
    conn = Connection(
        server, 
        user=USER_DOMAIN, 
        password=PASSWORD, 
        authentication=NTLM, 
        auto_bind=False,  # Manual binding
        read_only=True,
        check_names=False,  # Skip name checking
        lazy=False,
        raise_exceptions=True
    )
    
    # Bind manually with timeout
    if not conn.bind():
        print("Failed to authenticate")
        exit()

    filtro = f"(sAMAccountName={login})"
    atributos = [
        'displayName',
        'employeeID',
        'userAccountControl',
        'accountExpires',
    ]
 
    conn.search(search_base=BASE_DN, search_filter=filtro, attributes=atributos)
 
    if not conn.entries:
        print(f"No se encontró un usuario con login '{login}'")
        exit()
 
    usuario = conn.entries[0]

    datos = {
        "Nombre completo": usuario.displayName.value or "No definido",
        "Identificación": usuario.employeeID.value or "No definido",
        "Estado de la cuenta": estado_cuenta(usuario.userAccountControl.value),
        "Expiración de la cuenta": convertir_filedate_a_fecha(usuario.accountExpires),
    }
 
    mostrar_ventana(datos, login)
    print(datos)
 
except Exception as e:
    print("Error al conectar con Active Directory:", str(e))
