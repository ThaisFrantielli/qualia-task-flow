<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oportunidade_produto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('oportunidade_id')->constrained()->onDelete('cascade');
            $table->foreignId('produto_id')->constrained()->onDelete('cascade');
            $table->integer('quantidade')->default(1);
            $table->decimal('preco_unitario', 10, 2); // Preço no momento da adição
            $table->decimal('desconto_percentual', 5, 2)->default(0);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            
            // Garante que um produto não pode ser adicionado duas vezes na mesma oportunidade
            $table->unique(['oportunidade_id', 'produto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oportunidade_produto');
    }
};