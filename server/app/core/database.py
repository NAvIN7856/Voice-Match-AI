import json
import os
import threading
import uuid
from datetime import datetime
from pymongo import MongoClient
from app.core.config import settings
from app.core.logger import logger

class MockCollection:
    def __init__(self, db_client, name):
        self.db_client = db_client
        self.name = name

    def insert_one(self, document):
        return self.db_client._insert(self.name, document)

    def find_one(self, query):
        return self.db_client._find_one(self.name, query)

    def find(self, query=None, sort=None, limit=None):
        return self.db_client._find(self.name, query, sort, limit)

    def update_one(self, query, update):
        return self.db_client._update_one(self.name, query, update)

    def delete_one(self, query):
        return self.db_client._delete_one(self.name, query)

class MockDatabase:
    def __init__(self, filepath="local_db.json"):
        self.filepath = filepath
        self.lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        with self.lock:
            if not os.path.exists(self.filepath):
                with open(self.filepath, "w", encoding="utf-8") as f:
                    json.dump({"users": [], "comparisons": [], "voices": []}, f, default=str)

    def _read(self):
        with self.lock:
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {"users": [], "comparisons": [], "voices": []}

    def _write(self, data):
        with self.lock:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, default=str, indent=2)

    def _insert(self, collection_name, document):
        data = self._read()
        if "_id" not in document:
            document["_id"] = uuid.uuid4().hex
        
        # Clone doc and format datetime
        doc_to_save = {}
        for k, v in document.items():
            if isinstance(v, datetime):
                doc_to_save[k] = v.isoformat()
            else:
                doc_to_save[k] = v

        data.setdefault(collection_name, []).append(doc_to_save)
        self._write(data)
        
        class InsertOneResult:
            inserted_id = document["_id"]
        return InsertOneResult()

    def _find_one(self, collection_name, query):
        data = self._read()
        coll = data.get(collection_name, [])
        for doc in coll:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                return doc
        return None

    def _find(self, collection_name, query=None, sort=None, limit=None):
        data = self._read()
        coll = data.get(collection_name, [])
        results = []
        for doc in coll:
            if query:
                match = True
                for k, v in query.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if not match:
                    continue
            results.append(doc)
        
        if sort:
            # Sort by keys. E.g. sort=[("created_at", -1)]
            for sort_key, order in reversed(sort):
                results.sort(key=lambda x: x.get(sort_key, ""), reverse=(order == -1))
        
        if limit:
            results = results[:limit]
            
        return results

    def _update_one(self, collection_name, query, update):
        data = self._read()
        coll = data.get(collection_name, [])
        updated = False
        
        set_data = update.get("$set", {})
        
        for doc in coll:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                for uk, uv in set_data.items():
                    if isinstance(uv, datetime):
                        doc[uk] = uv.isoformat()
                    else:
                        doc[uk] = uv
                updated = True
                break
                
        if updated:
            self._write(data)
            
        class UpdateResult:
            modified_count = 1 if updated else 0
        return UpdateResult()

    def _delete_one(self, collection_name, query):
        data = self._read()
        coll = data.get(collection_name, [])
        index_to_delete = -1
        for i, doc in enumerate(coll):
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                index_to_delete = i
                break
        
        deleted = False
        if index_to_delete != -1:
            coll.pop(index_to_delete)
            data[collection_name] = coll
            self._write(data)
            deleted = True
            
        class DeleteResult:
            deleted_count = 1 if deleted else 0
        return DeleteResult()

    def __getitem__(self, name):
        return MockCollection(self, name)

# Try connecting to Mongo
db = None
is_mock = False

try:
    mongo_client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
    mongo_client.server_info()  # triggers connection failure if MongoDB is not running
    db = mongo_client[settings.DATABASE_NAME]
    logger.info("Connected to MongoDB successfully!")
except Exception as e:
    logger.warning(f"MongoDB connection failed: {e}. Falling back to local JSON database.")
    db = MockDatabase()
    is_mock = True
