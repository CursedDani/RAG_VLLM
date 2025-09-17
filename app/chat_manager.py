import json
import os
from datetime import datetime
from typing import List, Dict, Any

class ChatManager:
    def __init__(self, storage_path: str = "data/chats"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
        self.chats_index_file = os.path.join(storage_path, "chats_index.json")
        
    def load_chats_index(self) -> Dict[str, Dict]:
        """Load the index of all chats"""
        if os.path.exists(self.chats_index_file):
            try:
                with open(self.chats_index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_chats_index(self, index: Dict[str, Dict]):
        """Save the chats index"""
        with open(self.chats_index_file, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
    
    def create_new_chat(self, title: str = None) -> str:
        """Create a new chat and return its ID"""
        chat_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        if not title:
            title = f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        index = self.load_chats_index()
        index[chat_id] = {
            "title": title,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "message_count": 0
        }
        self.save_chats_index(index)
        
        # Create empty chat file
        self.save_chat_history(chat_id, [])
        return chat_id
    
    def get_chat_history(self, chat_id: str) -> List[tuple]:
        """Load chat history for a specific chat"""
        chat_file = os.path.join(self.storage_path, f"{chat_id}.json")
        if os.path.exists(chat_file):
            try:
                with open(chat_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return [(msg["role"], msg["content"]) for msg in data]
            except:
                return []
        return []
    
    def save_chat_history(self, chat_id: str, history: List[tuple]):
        """Save chat history for a specific chat"""
        chat_file = os.path.join(self.storage_path, f"{chat_id}.json")
        data = [{"role": role, "content": content} for role, content in history]
        
        with open(chat_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # Update index
        index = self.load_chats_index()
        if chat_id in index:
            index[chat_id]["last_updated"] = datetime.now().isoformat()
            index[chat_id]["message_count"] = len(history)
            self.save_chats_index(index)
    
    def delete_chat(self, chat_id: str):
        """Delete a chat"""
        chat_file = os.path.join(self.storage_path, f"{chat_id}.json")
        if os.path.exists(chat_file):
            os.remove(chat_file)
        
        index = self.load_chats_index()
        if chat_id in index:
            del index[chat_id]
            self.save_chats_index(index)
    
    def get_all_chats(self) -> Dict[str, Dict]:
        """Get all chats sorted by last updated"""
        index = self.load_chats_index()
        return dict(sorted(index.items(), 
                          key=lambda x: x[1]["last_updated"], 
                          reverse=True))