<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Produto extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nome',
        'codigo',
        'descricao',
        'preco_base',
        'ativo',
    ];

    protected $casts = [
        'preco_base' => 'decimal:2',
        'ativo' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the opportunities that include this product.
     */
    public function oportunidades(): BelongsToMany
    {
        return $this->belongsToMany(Oportunidade::class, 'oportunidade_produto')
            ->withPivot(['quantidade', 'preco_unitario', 'desconto_percentual', 'observacoes'])
            ->withTimestamps();
    }

    /**
     * Scope a query to only include active products.
     */
    public function scopeAtivo($query)
    {
        return $query->where('ativo', true);
    }
}