<?php

namespace Database\Factories;

use App\Models\Produto;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProdutoFactory extends Factory
{
    protected $model = Produto::class;

    public function definition(): array
    {
        return [
            'nome' => $this->faker->words(3, true),
            'codigo' => $this->faker->unique()->bothify('PRD-####??'),
            'descricao' => $this->faker->paragraph(),
            'preco_base' => $this->faker->randomFloat(2, 100, 5000),
            'ativo' => true,
        ];
    }

    /**
     * Indicate that the product is inactive.
     */
    public function inativo(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'ativo' => false,
            ];
        });
    }

    /**
     * Create a high-value product.
     */
    public function highValue(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'preco_base' => $this->faker->randomFloat(2, 5000, 20000),
                'nome' => 'Premium ' . $this->faker->words(2, true),
            ];
        });
    }
}