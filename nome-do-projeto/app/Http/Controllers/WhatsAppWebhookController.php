<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Oportunidade;
use App\Models\ChatMessage;
use App\Events\NewMessageCreated;

class WhatsAppWebhookController extends Controller
{
    public function handleWebhook(Request $request)
    {
        // Verify webhook signature (optional, based on Meta's documentation)
        $signature = $request->header('X-Hub-Signature');
        if (!$this->verifySignature($signature, $request->getContent())) {
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        // Process incoming payload
        $payload = $request->all();
        Log::info('Received WhatsApp webhook payload', $payload);

        // Extract message data
        $phoneNumber = $payload['entry'][0]['changes'][0]['value']['contacts'][0]['wa_id'] ?? null;
        $messageText = $payload['entry'][0]['changes'][0]['value']['messages'][0]['text']['body'] ?? null;

        if ($phoneNumber && $messageText) {
            // Find the corresponding Oportunidade
            $oportunidade = Oportunidade::where('customer_phone', $phoneNumber)->first();

            if ($oportunidade) {
                // Save the message to the database
                $chatMessage = ChatMessage::create([
                    'oportunidade_id' => $oportunidade->id,
                    'sender' => 'customer',
                    'content' => $messageText,
                ]);

                // Dispatch event to notify frontend
                broadcast(new NewMessageCreated($chatMessage));
            }
        }

        return response()->json(['status' => 'success']);
    }

    private function verifySignature($signature, $payload)
    {
        $secret = env('WHATSAPP_WEBHOOK_SECRET');
        $hash = 'sha256=' . hash_hmac('sha256', $payload, $secret);
        return hash_equals($hash, $signature);
    }
}