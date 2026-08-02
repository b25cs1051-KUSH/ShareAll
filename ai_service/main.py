from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List,Optional
from deepface import DeepFace
import numpy as np
from io import BytesIO
import os
import tempfile
import requests


app =FastAPI(title="Share-All media AI Microservice")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=['*'],
)

class ProcessFaceRequest(BaseModel):
    imageUrl:str

class MatchFacesRequest(BaseModel):
   userEmbedding: List[float]
   imageEmbedding: List[List[float]]
   threshold: Optional[float] =0.40 

@app.get("/")
def health_check():
  return{
    "status": "OK",
    "service": "Python AI Microservice is running on port 5000!"
  }

@app.post("/process-faces")
def process_faces(request: ProcessFaceRequest):
    try:
       headers={
          "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
       }
       response = requests.get(request.imageUrl,headers=headers,timeout=10)
       if response.status_code != 200:
          raise HTTPException(status_code=400,detail="Failed to download image from url")

       with tempfile.NamedTemporaryFile(delete=False,suffix='.jpg') as temp_file:
          temp_file.write(response.content)
          tmp_path = temp_file.name

       try:
          results = DeepFace.represent(
             img_path=tmp_path,
             model_name="Facenet",
             detector_backend="skip",#tells deepface to extract the embeddings directly from the image without requiring opencv's xml files...
             enforce_detection=False
          )

          extracted_face = []
          for face_data in results:
             embedding = face_data.get("embedding",[])
             area =face_data.get("facial_area",{})

             if embedding:
                extracted_face.append({
                   "embedding":embedding,
                   "box":area
                })
          return {
             "success":True,
             "facesFound": len(extracted_face),
             "faces": extracted_face
          }

       finally:
          if os.path.exists(tmp_path):
             os.remove(tmp_path)

    except Exception as e:
       return {
          "success":False,
          "error":str(e),
          "facesFound":0,
          "faces":[]
       }

@app.post("/match-faces")
def match_faces(request: MatchFacesRequest):
  try:
      user_vec = np.array(request.userEmbedding)
      matches = []

      for idx, img_emb in enumerate(request.imageEmbedding):
          img_vec = np.array(img_emb)

          # Calculate Cosine Distance
          dot_product = np.dot(user_vec, img_vec)
          norm_u = np.linalg.norm(user_vec)
          norm_v = np.linalg.norm(img_vec)
          
          if norm_u == 0 or norm_v == 0:
              distance = 1.0
          else:
              cosine_sim = dot_product / (norm_u * norm_v)
              distance = 1.0 - cosine_sim

          is_match = bool(distance <= request.threshold)

          matches.append({
              "faceIndex": idx,
              "distance": float(distance),
              "isMatch": is_match
          })

      has_match = any(m["isMatch"] for m in matches)

      return {
          "success": True,
          "isMatchFound": has_match,
          "matches": matches
      }

  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))