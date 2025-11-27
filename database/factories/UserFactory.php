<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => bcrypt('password'), // default password for testing
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the user is a sales representative.
     */
    public function salesRep(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'name' => 'Vendedor ' . $this->faker->firstName(),
                'email' => 'vendedor' . $this->faker->unique()->numberBetween(1, 100) . '@exemplo.com',
            ];
        });
    }
}