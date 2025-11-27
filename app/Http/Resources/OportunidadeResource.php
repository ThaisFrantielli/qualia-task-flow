<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OportunidadeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'titulo' => $this->titulo,
            'valor_total' => $this->valor_total,
            'status' => $this->status,
            'descricao' => $this->descricao,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            
            // Relationships
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ],
            
            // Counts
            'messages_count' => $this->whenCounted('chatMessages'),
            'produtos_count' => $this->whenCounted('produtos'),
            
            // Optional relationships
            'produtos' => ProdutoResource::collection($this->whenLoaded('produtos')),
            'latest_message' => new ChatMessageResource($this->whenLoaded('chatMessages', function () {
                return $this->chatMessages->first();
            })),
        ];
    }
}