<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProdutoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'codigo' => $this->codigo,
            'preco_base' => $this->preco_base,
            'ativo' => $this->ativo,
            
            // Pivot data when available
            'quantidade' => $this->whenPivotLoaded('oportunidade_produto', function () {
                return $this->pivot->quantidade;
            }),
            'preco_unitario' => $this->whenPivotLoaded('oportunidade_produto', function () {
                return $this->pivot->preco_unitario;
            }),
            'desconto_percentual' => $this->whenPivotLoaded('oportunidade_produto', function () {
                return $this->pivot->desconto_percentual;
            }),
            'observacoes' => $this->whenPivotLoaded('oportunidade_produto', function () {
                return $this->pivot->observacoes;
            }),
        ];
    }
}