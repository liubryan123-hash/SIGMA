from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, Response
import os
import uuid
import logging
import traceback
from omr_engine import process_omr_image
from template_generator import generate_template_pdf

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("OMR_Service")

app = FastAPI(title="SIGMA OMR Service", version="1.0.0")

UPLOAD_DIR = "/tmp/omr_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}
MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "OMR Service"}

@app.post("/api/omr/process")
async def process_exam(
    image: UploadFile = File(...),
    id_resultado: str = Form(""),
    template_config: str = Form("{}") # Opcional: para pasar info de la plantilla (nro preguntas, layout) si es dinámico.
):
    """
    Recibe una imagen de un examen, la guarda temporalmente,
    y ejecuta el motor OMRChecker sobre ella.
    Retorna un JSON compatible con el frontend de 'Revisión Humana' de SIGMA.
    """
    logger.info(f"Recibiendo solicitud de procesamiento. ID Resultado: {id_resultado}, Archivo: {image.filename}")
    
    if not image.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó ningún archivo de imagen.")

    ext = os.path.splitext(image.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no permitido: '{ext}'. Use: jpg, jpeg, png, webp, bmp, tiff.",
        )

    content = await image.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande (máximo 20 MB).")

    # Generar un nombre temporal único
    tmp_filename = f"{uuid.uuid4()}{ext}"
    tmp_filepath = os.path.join(UPLOAD_DIR, tmp_filename)

    try:
        # Guardar imagen en disco
        with open(tmp_filepath, "wb") as f:
            f.write(content)
            
        logger.info(f"Imagen guardada en {tmp_filepath}")
        
        # --- LLAMADA AL MOTOR OMR ---
        # Separado en omr_engine.py para mantener la lógica de OpenCV aislada y reemplazable.
        result = process_omr_image(tmp_filepath, template_config)
        
        # Eliminar imagen temporal (opcional: comentar para depurar)
        if os.path.exists(tmp_filepath):
            os.remove(tmp_filepath)
            
        logger.info(f"Procesamiento exitoso para ID {id_resultado}")
        
        # Estructura JSON esperada por SIGMA Node.js
        return JSONResponse(content={
            "ok": True,
            "id_resultado": id_resultado,
            "respuestas_detectadas": result.get("respuestas_detectadas", {}),
            "confianza_por_pregunta": result.get("confianza_por_pregunta", {}),
            "codigo_leido_ia": result.get("codigo_leido", None)
        })

    except Exception as e:
        logger.error(f"Error procesando imagen: {str(e)}\n{traceback.format_exc()}")
        # Intentar limpiar archivo en caso de fallo
        if os.path.exists(tmp_filepath):
            os.remove(tmp_filepath)
            
        return JSONResponse(status_code=500, content={
            "ok": False,
            "id_resultado": id_resultado,
            "error": f"Error interno en motor OMR: {str(e)}"
        })

@app.post("/api/omr/template")
async def get_template(
    academy_name: str = Form("ACADEMIA"),
    exam_title:   str = Form("HOJA DE RESPUESTAS"),
    n_questions:  int = Form(100),
    logo: UploadFile = File(None),
):
    """
    Genera y descarga el PDF de la ficha estándar SIGMA OMR.
    Campos de formulario (multipart/form-data):
        academy_name  — nombre de la academia
        exam_title    — título del examen
        n_questions   — número de preguntas activas (1-100)
        logo          — imagen del logo (opcional, PNG/JPG)
    """
    if not (1 <= n_questions <= 100):
        raise HTTPException(status_code=400,
                            detail="n_questions debe estar entre 1 y 100")

    logo_tmp = None
    try:
        if logo and logo.filename:
            logo_ext = os.path.splitext(logo.filename)[1].lower()
            if logo_ext not in {'.png', '.jpg', '.jpeg', '.webp'}:
                raise HTTPException(status_code=400, detail="Logo debe ser PNG, JPG o WEBP.")
            logo_content = await logo.read()
            if len(logo_content) > 2 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Logo demasiado grande (max 2 MB).")
            logo_tmp = os.path.join(UPLOAD_DIR, f"logo_{uuid.uuid4()}{logo_ext}")
            with open(logo_tmp, "wb") as f:
                f.write(logo_content)

        pdf_bytes = generate_template_pdf(
            academy_name=academy_name,
            exam_title=exam_title,
            n_questions=n_questions,
            logo_path=logo_tmp,
        )
    finally:
        if logo_tmp and os.path.exists(logo_tmp):
            os.remove(logo_tmp)

    safe_name = academy_name.lower().replace(" ", "_")
    filename  = f"ficha_omr_{safe_name}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
