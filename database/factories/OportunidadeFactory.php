<?php

namespace Database\Factories;

use App\Models\Oportunidade;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class OportunidadeFactory extends Factory
{
    protected $model = Oportunidade::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'titulo' => $this->faker->sentence(4),
            'valor_total' => $this->faker->randomFloat(2, 1000, 50000),
            'status' => $this->faker->randomElement(['aberta', 'fechada', 'cancelada']),
            'descricao' => $this->faker->paragraph(),
            'created_at' => $this->faker->dateTimeBetween('-3 months', 'now'),
        ];
    }

    /**
     * Indicate that the opportunity is open.
     */
    public function aberta(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'aberta',
            ];
        });
    }

    /**
     * Indicate that the opportunity is recent.
     */
    public function recent(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'created_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
            ];
        });
    }
}