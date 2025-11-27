<?php

namespace Database\Factories;

use App\Models\ChatMessage;
use App\Models\Oportunidade;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChatMessageFactory extends Factory
{
    protected $model = ChatMessage::class;

    public function definition(): array
    {
        return [
            'oportunidade_id' => Oportunidade::factory(),
            'user_id' => User::factory(),
            'content' => $this->faker->paragraph(),
            'parent_message_id' => null,
            'is_system_message' => false,
            'metadata' => null,
            'read_at' => $this->faker->optional(0.7)->dateTimeBetween('-1 day', 'now'),
            'created_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ];
    }

    /**
     * Create a system message.
     */
    public function system(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'is_system_message' => true,
                'content' => $this->faker->randomElement([
                    'Oportunidade atualizada: valor total alterado para R$ ' . number_format($this->faker->randomFloat(2, 1000, 50000), 2, ',', '.'),
                    'Novo produto adicionado à oportunidade',
                    'Status da oportunidade alterado para: ' . $this->faker->randomElement(['Em Negociação', 'Aguardando Aprovação', 'Fechada']),
                ]),
                'metadata' => [
                    'type' => 'status_change',
                    'old_value' => 'Em Aberto',
                    'new_value' => 'Em Negociação',
                ],
            ];
        });
    }

    /**
     * Create a message with attachments.
     */
    public function withAttachment(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'content' => $this->faker->sentence() . ' 📎',
                'metadata' => [
                    'attachments' => [
                        [
                            'name' => 'proposta_' . $this->faker->numberBetween(1, 100) . '.pdf',
                            'size' => $this->faker->numberBetween(100000, 5000000),
                            'type' => 'application/pdf',
                        ]
                    ]
                ],
            ];
        });
    }
}