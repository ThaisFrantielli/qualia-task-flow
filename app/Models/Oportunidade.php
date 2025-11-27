<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Oportunidade extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'titulo',
        'valor_total',
        'status',
        'descricao',
    ];

    protected $casts = [
        'valor_total' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the user that owns the opportunity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the chat messages for the opportunity.
     */
    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    /**
     * Get the products associated with the opportunity.
     */
    public function produtos(): BelongsToMany
    {
        return $this->belongsToMany(Produto::class, 'oportunidade_produto')
            ->withPivot(['quantidade', 'preco_unitario', 'desconto_percentual', 'observacoes'])
            ->withTimestamps();
    }

    /**
     * Calculate the total value of the opportunity.
     */
    public function calculateTotal(): float
    {
        return $this->produtos->sum(function ($produto) {
            $precoBase = $produto->pivot->preco_unitario * $produto->pivot->quantidade;
            $desconto = $precoBase * ($produto->pivot->desconto_percentual / 100);
            return $precoBase - $desconto;
        });
    }
}