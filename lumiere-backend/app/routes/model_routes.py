# app/routes/model_routes.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from app.services.model_service import save_model, list_models, get_model_file

router = APIRouter()


@router.post("/upload")
async def upload_model(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form("uncategorized"),
    description: str = Form(None),
):
    if not file.filename.lower().endswith((".glb", ".gltf")):
        raise HTTPException(status_code=400, detail="Only GLB/GLTF files allowed")
    model_id = await save_model(file, name, description, category)
    return {"message": "Model uploaded", "id": model_id}


@router.get("/list")
async def get_models():
    return await list_models()


@router.get("/download/{filename:path}")
async def download_model(filename: str):
    """
    The :path converter lets filenames contain slashes
    (e.g. chairs/modern_chair.glb) so Mega sub-folder structure is preserved.
    """
    filepath = await get_model_file(filename)
    if filepath:
        return FileResponse(
            filepath,
            media_type="model/gltf-binary",
            filename=filename.split("/")[-1],
        )
    raise HTTPException(status_code=404, detail="File not found")