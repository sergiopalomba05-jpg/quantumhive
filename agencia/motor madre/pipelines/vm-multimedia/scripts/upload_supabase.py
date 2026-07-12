"""
Módulo de Upload a Supabase Storage
====================================
Sube videos generados a Supabase Storage y retorna URLs públicas.
"""

import os
import time
from pathlib import Path
from typing import Optional

from supabase import create_client, Client


def get_supabase_client(
    supabase_url: str,
    supabase_key: str
) -> Client:
    """Crea un cliente de Supabase."""
    return create_client(supabase_url, supabase_key)


def upload_video(
    local_path: str,
    dish_id: str,
    restaurant_name: str,
    supabase_url: str,
    supabase_key: str,
    bucket: str = "avatar-videos"
) -> Optional[str]:
    """
    Sube un video a Supabase Storage.

    Args:
        local_path: Ruta local del video
        dish_id: ID del plato
        restaurant_name: Nombre del restaurante
        supabase_url: URL de Supabase
        supabase_key: API key de Supabase
        bucket: Nombre del bucket

    Returns:
        URL pública del video o None si falla
    """
    if not os.path.exists(local_path):
        raise FileNotFoundError(f"Video no encontrado: {local_path}")

    # Crear cliente
    supabase = get_supabase_client(supabase_url, supabase_key)

    # Path en el bucket: restaurant_name/dish_id.webm
    file_ext = Path(local_path).suffix
    storage_path = f"{restaurant_name}/{dish_id}{file_ext}"

    # Subir archivo
    with open(local_path, 'rb') as f:
        file_data = f.read()

    try:
        # Upsert (sobrescribir si ya existe)
        result = supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=file_data,
            file_options={
                "content-type": "video/webm",
                "upsert": "true"
            }
        )

        # Obtener URL pública
        public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
        return public_url

    except Exception as e:
        print(f"    [ERROR] Upload Supabase: {e}")
        return None


def delete_video(
    dish_id: str,
    restaurant_name: str,
    supabase_url: str,
    supabase_key: str,
    bucket: str = "avatar-videos"
) -> bool:
    """Elimina un video de Supabase Storage."""
    supabase = get_supabase_client(supabase_url, supabase_key)
    storage_path = f"{restaurant_name}/{dish_id}.webm"

    try:
        supabase.storage.from_(bucket).remove([storage_path])
        return True
    except Exception as e:
        print(f"    [ERROR] Delete Supabase: {e}")
        return False


def list_videos(
    restaurant_name: str,
    supabase_url: str,
    supabase_key: str,
    bucket: str = "avatar-videos"
) -> list:
    """Lista todos los videos de un restaurante."""
    supabase = get_supabase_client(supabase_url, supabase_key)

    try:
        files = supabase.storage.from_(bucket).list(restaurant_name)
        return files
    except Exception as e:
        print(f"    [ERROR] List Supabase: {e}")
        return []


def get_video_url(
    dish_id: str,
    restaurant_name: str,
    supabase_url: str,
    supabase_key: str,
    bucket: str = "avatar-videos"
) -> Optional[str]:
    """Obtiene la URL pública de un video existente."""
    supabase = get_supabase_client(supabase_url, supabase_key)
    storage_path = f"{restaurant_name}/{dish_id}.webm"

    try:
        public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
        return public_url
    except Exception:
        return None
