from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, Response
import os
import shutil
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
    
    # Generar un nombre temporal único
    file_extension = os.path.splitext(image.filename)[1]
    tmp_filename = f"{uuid.uuid4()}{file_extension}"
    tmp_filepath = os.path.join(UPLOAD_DIR, tmp_filename)
    
    try:
        # Guardar imagen en disco
        with open(tmp_filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
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

@app.get("/api/omr/template")
async def get_template(
    academy_name: str = "ACADEMIA",
    exam_title: str = "HOJA DE RESPUESTAS",
    n_questions: int = 100,
):
    """
    Genera y descarga el PDF de la ficha estándar SIGMA OMR.
    Parámetros opcionales (query string):
        academy_name  — nombre de la academia
        exam_title    — título del examen
        n_questions   — número de preguntas activas (1-100)
    """
    if not (1 <= n_questions <= 100):
        raise HTTPException(status_code=400,
                            detail="n_questions debe estar entre 1 y 100")

    pdf_bytes = generate_template_pdf(
        academy_name=academy_name,
        exam_title=exam_title,
        n_questions=n_questions,
    )

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
