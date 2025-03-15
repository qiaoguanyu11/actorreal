from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MediaResponse(BaseModel):
    id: int
    url: str
    thumbnail_url: Optional[str] = None
    type: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    album: Optional[str] = None
    category: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class MediaList(BaseModel):
    actor_id: str
    actor_name: Optional[str] = None
    items: List[MediaResponse]
    
    class Config:
        from_attributes = True 