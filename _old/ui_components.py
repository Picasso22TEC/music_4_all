# ui_components.py
import streamlit as st
import random

def load_css_and_animations():
    """Carga los estilos globales, CSS Neón y animaciones de fondo."""

    st.markdown(f"""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;700;900&display=swap');

        /* BASE */
        .stApp {{
            background-color: #050505;
            background-image: radial-gradient(circle at 50% 10%, #1a1a1a 0%, #000000 100%);
            color: #ffffff;
            font-family: 'Montserrat', sans-serif;
        }}

        /* ANIMACIONES */
        @keyframes box-flicker {{
            0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {{
                box-shadow: 0 0 10px #fff, 0 0 20px #00FFFF, inset 0 0 10px #00FFFF;
                border-color: #fff;
            }}
            20%, 24%, 55% {{ box-shadow: none; border-color: #333; }}
        }}
        @keyframes box-flicker-purple {{
            0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {{
                box-shadow: 0 0 10px #fff, 0 0 20px #D500F9, inset 0 0 10px #D500F9;
                border-color: #fff;
            }}
            20%, 24%, 55% {{ box-shadow: none; border-color: #444; }}
        }}
        @keyframes text-flicker {{
            0%, 18%, 22%, 25%, 53%, 57%, 100% {{
                opacity: 1;
                text-shadow: 0 0 5px #fff, 0 0 10px #00FFFF, 0 0 20px #00FFFF;
            }}
            20%, 24%, 55% {{ opacity: 0.5; text-shadow: none; }}
        }}
        @keyframes floatUp {{
            0%   {{ transform: translateY(0) rotate(0deg); opacity: 0.2; }}
            100% {{ transform: translateY(-100vh) rotate(360deg); opacity: 0; }}
        }}

        /* TÍTULO NEÓN (cartel fundido) */
        .neon-box {{
            border: 2px solid #fff;
            border-radius: 15px;
            padding: 10px 30px;
            display: inline-block;
            box-shadow: 0 0 10px #fff, 0 0 20px #00FFFF, inset 0 0 10px #00FFFF;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(5px);
            animation: box-flicker 4s infinite;
        }}
        .neon-text {{
            font-weight: 900;
            font-size: 2.5rem;
            color: #fff;
            margin: 0;
            letter-spacing: 2px;
            text-shadow: 0 0 5px #fff, 0 0 10px #00FFFF;
            animation: text-flicker 3s infinite alternate;
        }}

        /* ==========================================
           SPRINT: Login boxes con efecto neón fundido
           igual al título principal.
           PROBLEMA ORIGINAL: Las cajas de login eran
           recuadros planos con borde simple de color,
           visualmente inconsistentes con el cartel neón.
           CORRECCIÓN: Se usan las mismas animaciones
           box-flicker / box-flicker-purple con inset glow
           y border-color animado, idéntico al .neon-box.
           ========================================== */
        .step-box-cyan {{
            border: 2px solid #fff;
            border-radius: 12px;
            padding: 25px 30px;
            background: rgba(0, 255, 255, 0.04);
            box-shadow: 0 0 10px #fff, 0 0 20px #00FFFF, inset 0 0 8px #00FFFF;
            animation: box-flicker 4s infinite;
            margin-bottom: 20px;
            text-align: center;
        }}
        .step-box-purple {{
            border: 2px solid #fff;
            border-radius: 12px;
            padding: 25px 30px;
            background: rgba(213, 0, 249, 0.04);
            box-shadow: 0 0 10px #fff, 0 0 20px #D500F9, inset 0 0 8px #D500F9;
            animation: box-flicker-purple 4s infinite 0.5s;
            margin-bottom: 20px;
            text-align: center;
        }}
        .auth-code {{
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 3.5rem;
            font-weight: 900;
            color: #fff;
            text-shadow: 0 0 10px #D500F9, 0 0 20px #D500F9, 0 0 40px #D500F9;
            letter-spacing: 8px;
            margin: 15px 0;
            animation: text-flicker 3s infinite alternate;
        }}
        .auth-link {{
            display: inline-block;
            margin-top: 10px;
            padding: 12px 25px;
            background: rgba(0, 255, 255, 0.1);
            border: 2px solid #00FFFF;
            color: #00FFFF !important;
            font-size: 1.1rem;
            font-weight: bold;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.3s;
            font-family: 'Montserrat', sans-serif;
        }}
        .auth-link:hover {{
            background: rgba(0, 255, 255, 0.25);
            box-shadow: 0 0 20px #00FFFF;
            transform: translateY(-2px);
        }}

        /* BOTONES */
        div.stButton > button {{
            border-radius: 8px;
            font-weight: 700;
            text-transform: uppercase;
            transition: all 0.2s;
            height: 45px;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
        }}
        div.stButton > button[kind="primary"] {{
            border: 2px solid #D500F9 !important;
            color: #D500F9 !important;
            background-color: rgba(213, 0, 249, 0.1) !important;
            box-shadow: 0 0 10px rgba(213, 0, 249, 0.2);
        }}
        div.stButton > button[kind="primary"]:hover {{
            background-color: rgba(213, 0, 249, 0.25) !important;
            box-shadow: 0 0 18px rgba(213, 0, 249, 0.5) !important;
            transform: translateY(-1px);
        }}
        div.stButton > button[kind="secondary"] {{
            border: 2px solid #FF0000 !important;
            color: #FF0000 !important;
            background-color: rgba(255, 0, 0, 0.1) !important;
        }}
        div.stButton > button[kind="secondary"]:hover {{
            background-color: rgba(255, 0, 0, 0.25) !important;
            box-shadow: 0 0 18px rgba(255, 0, 0, 0.4) !important;
            transform: translateY(-1px);
        }}

        /* DOWNLOAD BUTTON (ZIP) */
        div.stDownloadButton > button {{
            border: 2px solid #00FF00 !important;
            color: #00FF00 !important;
            background-color: rgba(0, 255, 0, 0.1) !important;
            box-shadow: 0 0 12px rgba(0, 255, 0, 0.3);
            font-weight: 700;
            text-transform: uppercase;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            height: 50px;
            border-radius: 8px;
        }}
        div.stDownloadButton > button:hover {{
            background-color: rgba(0, 255, 0, 0.2) !important;
            box-shadow: 0 0 22px rgba(0, 255, 0, 0.6) !important;
            transform: translateY(-1px);
        }}

        /* INPUT */
        .stTextInput > div > div > input {{
            background-color: #111;
            border: 1px solid #333;
            color: white;
            border-radius: 8px;
            font-family: 'Montserrat', sans-serif;
            transition: border-color 0.2s, box-shadow 0.2s;
        }}
        .stTextInput > div > div > input:focus {{
            border-color: #D500F9;
            box-shadow: 0 0 10px rgba(213, 0, 249, 0.3);
        }}

        /* ÁLBUM / TRACK ROWS */
        .album-header {{
            display: flex;
            gap: 20px;
            background: rgba(20,20,20,0.6);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #333;
            margin-top: 10px;
            margin-bottom: 20px;
            position: relative;
            width: 100%;
            box-sizing: border-box;
        }}
        .track-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: #0e0e0e;
            border-bottom: 1px solid #222;
            padding: 8px 15px;
            margin-bottom: 4px;
            border-radius: 6px;
            transition: background 0.15s;
        }}
        .track-row:hover {{ background-color: #151515; }}
        .track-left {{
            display: flex;
            align-items: center;
            gap: 15px;
            overflow: hidden;
        }}
        .track-thumb {{
            width: 40px;
            height: 40px;
            border-radius: 4px;
            object-fit: cover;
            flex-shrink: 0;
        }}
        .track-info {{
            display: flex;
            flex-direction: column;
            overflow: hidden;
            white-space: nowrap;
        }}
        .t-title {{
            font-size: 14px;
            font-weight: 600;
            color: #eee;
            text-overflow: ellipsis;
            overflow: hidden;
        }}
        .t-artist {{
            font-size: 12px;
            color: #888;
        }}

        /* BADGES */
        .header-badge-container {{
            position: absolute;
            top: 15px;
            right: 15px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
        }}
        .badge-main {{
            color: #000;
            font-weight: 900;
            font-size: 0.8rem;
            padding: 4px 8px;
            border-radius: 4px;
            text-align: center;
            min-width: 60px;
        }}
        .badge-sub {{
            color: #fff;
            font-size: 0.6rem;
            background: rgba(0,0,0,0.5);
            padding: 2px 6px;
            border-radius: 3px;
            letter-spacing: 1px;
        }}

        /* MISC */
        label[data-testid="stCheckbox"] {{ align-items: center; }}
        #MainMenu {{visibility: hidden;}}
        footer {{visibility: hidden;}}
        </style>

        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; z-index: 0; overflow: hidden;">
            {''.join([
                f"<div style='position:fixed; color:#333; opacity:0.18; "
                f"animation: floatUp linear infinite; "
                f"left:{random.randint(0,100)}%; top:{random.randint(20,100)}%; "
                f"font-size:{random.randint(1,4)}rem; "
                f"animation-duration:{random.randint(10,25)}s; "
                f"animation-delay:-{random.randint(0,10)}s;'>"
                f"{random.choice(['♪','♫','♩'])}</div>"
                for _ in range(25)
            ])}
        </div>
    """, unsafe_allow_html=True)


def make_progress_bar(percent: float, status_text: str = "", color: str = "#D500F9") -> str:
    """
    Genera el HTML dinámico para la barra de progreso.

    Cambios vs original:
    - El color cambia a verde cuando llega al 100%.
    - Se clampea percent entre 0 y 1 para evitar barras > 100%.
    - El texto de estado acepta cualquier string (útil para mostrar
      el nombre corto de la pista en el futuro).
    """
    percent = max(0.0, min(1.0, percent))  # Clamp 0-1
    bar_color = "#00FF00" if percent >= 1.0 else color
    width_css = int(percent * 100)
    glow = f"0 0 6px {bar_color}"

    return f"""
    <div style="display:flex; flex-direction:column; width:100%; min-width:150px;
                justify-content:center; padding: 6px 0;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span style="font-size:10px; color:#aaa; font-family:'Consolas', monospace;
                         text-overflow:ellipsis; overflow:hidden; white-space:nowrap;
                         max-width:80%;">{status_text}</span>
            <span style="font-size:10px; color:#fff; font-weight:bold;
                         font-family:'Montserrat', sans-serif;">{width_css}%</span>
        </div>
        <div style="width:100%; background-color:#2a2a2a; height:5px;
                    border-radius:3px; overflow:hidden;">
            <div style="width:{width_css}%; background-color:{bar_color}; height:100%;
                        box-shadow:{glow}; transition: width 0.2s ease;"></div>
        </div>
    </div>
    """


def trigger_auto_download(file_path: str, auto_trigger: bool = False):
    """
    Descarga automática con fallback seguro a botón estándar.
    
    Args:
        file_path: Ruta completa del archivo a descargar
        auto_trigger: Si es True, intenta descarga automática; si False, usa botón
    
    Uso:
        - Auto: trigger_auto_download("path/file.flac", auto_trigger=True)
        - Manual: trigger_auto_download("path/file.flac", auto_trigger=False)
    """
    from pathlib import Path
    import base64
    
    try:
        # Validar que el archivo existe
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            st.error(f"❌ Archivo no encontrado: {file_path}")
            return False
        
        if not file_path_obj.is_file():
            st.error(f"❌ La ruta no es un archivo: {file_path}")
            return False
        
        # Leer archivo
        with open(file_path, "rb") as f:
            data = f.read()
        
        filename = file_path_obj.name
        
        if auto_trigger:
            # Intenta descarga automática via JavaScript
            b64 = base64.b64encode(data).decode()
            js_code = f"""
            <script>
                (function() {{
                    try {{
                        var link = document.createElement('a');
                        link.href = 'data:application/octet-stream;base64,{b64}';
                        link.download = '{filename}';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }} catch(e) {{
                        console.error('Error descargando archivo:', e);
                    }}
                }})();
            </script>
            """
            st.components.v1.html(js_code, height=0, width=0)
            return True
        else:
            # Fallback: botón de descarga estándar
            st.download_button(
                label="⬇️ Descargar FLAC",
                data=data,
                file_name=filename,
                mime="audio/flac",
                key=f"download_{filename}_{id(file_path)}"
            )
            return True
            
    except Exception as e:
        st.error(f"❌ Error en descarga: {str(e)}")
        return False
