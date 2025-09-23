<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'content' => $this->content,
            'is_system_message' => $this->is_system_message,
            'metadata' => $this->metadata,
            'read_at' => $this->read_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            
            // User who sent the message
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ],
            
            // Threading information
            'parent_message_id' => $this->parent_message_id,
            'replies_count' => $this->whenCounted('replies'),
            
            // Include replies if they're loaded
            'replies' => ChatMessageResource::collection($this->whenLoaded('replies')),
            
            // Include parent message if it's loaded
            'parent_message' => new ChatMessageResource($this->whenLoaded('parentMessage')),
        ];
    }
}