<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Produto;
use App\Models\Oportunidade;
use App\Models\ChatMessage;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create base products (will be reused across opportunities)
        $produtos = Produto::factory(20)->create();
        
        // Create some premium products
        $produtos = $produtos->concat(
            Produto::factory(5)->highValue()->create()
        );

        // Create some inactive products
        Produto::factory(3)->inativo()->create();

        // Create sales representatives
        $vendedores = User::factory(5)->salesRep()->create();

        // Create regular users (customers/managers)
        $users = User::factory(3)->create();

        // Create opportunities for each sales rep
        $vendedores->each(function ($vendedor) use ($produtos) {
            // Create 5-10 opportunities per sales rep
            Oportunidade::factory(rand(5, 10))
                ->aberta()
                ->create([
                    'user_id' => $vendedor->id,
                ])
                ->each(function ($oportunidade) use ($produtos) {
                    // Add 2-5 random products to each opportunity
                    $produtosOportunidade = $produtos->random(rand(2, 5));
                    
                    $produtosOportunidade->each(function ($produto) use ($oportunidade) {
                        $oportunidade->produtos()->attach($produto->id, [
                            'quantidade' => rand(1, 5),
                            'preco_unitario' => $produto->preco_base * (1 - (rand(0, 20) / 100)), // Random discount up to 20%
                            'desconto_percentual' => rand(0, 20),
                            'observacoes' => rand(0, 1) ? 'Negociação especial' : null,
                        ]);
                    });

                    // Create a conversation thread for each opportunity
                    $this->createConversationThread($oportunidade);
                });
        });

        // Create some closed and cancelled opportunities
        Oportunidade::factory(5)->create(['status' => 'fechada']);
        Oportunidade::factory(3)->create(['status' => 'cancelada']);
    }

    private function createConversationThread($oportunidade): void
    {
        // Create initial system message
        $initialMessage = ChatMessage::factory()
            ->system()
            ->create([
                'oportunidade_id' => $oportunidade->id,
                'user_id' => $oportunidade->user_id,
                'created_at' => $oportunidade->created_at,
            ]);

        // Create 3-8 regular messages
        $messages = ChatMessage::factory(rand(3, 8))
            ->create([
                'oportunidade_id' => $oportunidade->id,
                'created_at' => $oportunidade->created_at->addMinutes(rand(1, 60)),
            ]);

        // Add some replies to random messages
        $messages->random(min(2, count($messages)))->each(function ($message) use ($oportunidade) {
            ChatMessage::factory(rand(1, 2))
                ->create([
                    'oportunidade_id' => $oportunidade->id,
                    'parent_message_id' => $message->id,
                    'created_at' => $message->created_at->addMinutes(rand(5, 30)),
                ]);
        });

        // Add a message with attachment occasionally
        if (rand(0, 1)) {
            ChatMessage::factory()
                ->withAttachment()
                ->create([
                    'oportunidade_id' => $oportunidade->id,
                    'created_at' => now()->subHours(rand(1, 24)),
                ]);
        }
    }
}