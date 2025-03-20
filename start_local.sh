minio server /Users/qiaoguanyu/Music/actorreal/minio/data --console-address ":9001"
cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002
cd frontend && npm start