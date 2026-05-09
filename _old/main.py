import webview
import threading
import time
import json

# Aquí importamos tu lógica (simulada por ahora para probar la UI)
# from downloader import TidalDownloader


class Api:
    def __init__(self):
        self._cancel_flag = False

    def descargar(self, link):
        """Esta función es llamada desde el Javascript"""
        if not link:
            return {"status": "error", "msg": "¡El enlace está vacío!"}

        print(f"Iniciando descarga de: {link}")
        self._cancel_flag = False

        # Simulamos proceso de descarga (Aquí iría tu lógica real)
        time.sleep(1)
        if self._cancel_flag:
            return {"status": "error", "msg": "Cancelado"}

        return {"status": "success", "msg": f"Descarga completada: {link}"}

    def cancelar(self):
        print("Cancelando...")
        self._cancel_flag = True
        return {"status": "info", "msg": "Cancelación solicitada"}


# --- TU DISEÑO V7.0 ORIGINAL (HTML + CSS) ---
html_content = """
<!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap');
        
        body {
            background-color: #050505;
            background-image: radial-gradient(circle at 50% 10%, #1a1a1a 0%, #000000 100%);
            color: #ffffff;
            font-family: 'Montserrat', sans-serif;
            height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        /* TÍTULO NEÓN FLICKER */
        .neon-box {
            border: 4px solid #fff; border-radius: 15px; padding: 20px 60px;
            box-shadow: 0 0 10px #fff, 0 0 20px #00FFFF, inset 0 0 10px #00FFFF;
            animation: box-flicker 4s infinite; background: rgba(0,0,0,0.6);
            margin-bottom: 50px;
        }
        .neon-text {
            font-weight: 900; font-size: 3.5rem; color: #fff; margin: 0; letter-spacing: 3px;
            text-shadow: 0 0 5px #fff, 0 0 10px #00FFFF, 0 0 20px #00FFFF;
            animation: text-flicker 3s infinite alternate;
        }

        /* INPUT FIELD */
        input[type="text"] {
            background-color: #080808; border: 2px solid #333; border-radius: 10px;
            color: white; padding: 15px; font-size: 1.2rem; width: 60%;
            margin-right: 10px; transition: 0.3s; font-family: 'Montserrat', sans-serif;
        }
        input[type="text"]:focus {
            border-color: #00FFFF; box-shadow: 0 0 15px rgba(0,255,255,0.3); outline: none;
        }

        /* BOTONES */
        .btn-container { display: flex; gap: 20px; margin-top: 30px; width: 80%; }
        
        button {
            border: none; background: transparent; color: white; font-weight: 900;
            font-family: 'Montserrat', sans-serif; letter-spacing: 1px; transition: 0.3s;
            height: 60px; width: 100%; text-transform: uppercase; font-size: 1.2rem;
            cursor: pointer; backdrop-filter: blur(5px);
        }

        /* BTN MORADO */
        .btn-dl {
            border: 3px solid #D500F9; border-radius: 12px; color: #D500F9;
            box-shadow: 0 0 10px #D500F9, inset 0 0 10px #D500F9; text-shadow: 0 0 5px #D500F9;
            animation: purple-flicker 3s infinite alternate;
        }
        .btn-dl:hover { background-color: rgba(213, 0, 249, 0.1); transform: translateY(-2px); }

        /* BTN ROJO */
        .btn-cancel {
            border: 3px solid #FF0000; border-radius: 12px; color: #FF0000;
            box-shadow: 0 0 10px #FF0000, inset 0 0 10px #FF0000; text-shadow: 0 0 5px #FF0000;
        }
        .btn-cancel:hover { background-color: rgba(255, 0, 0, 0.1); transform: translateY(-2px); }

        /* BTN GRIS (Borrar) */
        .btn-clear {
            border: 3px solid #666; border-radius: 10px; color: #888;
            width: 120px; font-size: 1rem;
        }
        .btn-clear:hover { border-color: #aaa; color: #fff; }

        /* ANIMACIONES */
        @keyframes box-flicker {
            0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { box-shadow: 0 0 10px #fff, 0 0 20px #00FFFF, inset 0 0 10px #00FFFF; border-color: #fff; }
            20%, 24%, 55% { box-shadow: none; border-color: #333; }
        }
        @keyframes text-flicker {
            0%, 18%, 22%, 25%, 53%, 57%, 100% { opacity: 1; text-shadow: 0 0 5px #fff, 0 0 10px #00FFFF, 0 0 20px #00FFFF; }
            20%, 24%, 55% { opacity: 0.5; text-shadow: none; }
        }

        #status { margin-top: 20px; color: #888; font-size: 0.9rem; }
    </style>
</head>
<body>

    <div class="neon-box"><h1 class="neon-text">Music for All</h1></div>

    <div style="display:flex; width: 80%; justify-content: center;">
        <input type="text" id="linkInput" placeholder="Pegue enlace de Tidal aquí...">
        <button class="btn-clear" onclick="limpiar()">BORRAR</button>
    </div>

    <div class="btn-container">
        <button class="btn-dl" onclick="descargar()">DESCARGAR</button>
        <button class="btn-cancel" onclick="cancelar()">CANCELAR</button>
    </div>

    <p id="status">Esperando...</p>

    <script>
        async function descargar() {
            let link = document.getElementById('linkInput').value;
            document.getElementById('status').innerText = "Conectando...";
            document.getElementById('status').style.color = "#00FFFF";
            
            // Llamada a Python
            let response = await pywebview.api.descargar(link);
            
            document.getElementById('status').innerText = response.msg;
            document.getElementById('status').style.color = response.status === 'error' ? 'red' : '#00FF00';
        }

        async function cancelar() {
            let response = await pywebview.api.cancelar();
            document.getElementById('status').innerText = "Cancelado.";
            document.getElementById('status').style.color = "red";
        }

        function limpiar() {
            document.getElementById('linkInput').value = '';
            document.getElementById('status').innerText = "Listo.";
            document.getElementById('status').style.color = "#888";
        }
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    api = Api()
    webview.create_window(
        "Music for All - Ultimate Edition",
        html=html_content,
        width=1000,
        height=700,
        background_color="#000000",
    )
    webview.start()
